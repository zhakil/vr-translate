/**
 * Authentication service for user registration and login
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { createLogger } from '../logging/Logger';
import configService from '../config/ConfigService';
import { 
    User, 
    RegisterRequest, 
    LoginRequest, 
    AuthResponse, 
    JWTPayload,
    UserPreferences,
    DEFAULT_MEMORY_SETTINGS 
} from '../types/memory';
import { 
    AppError, 
    ErrorHandler, 
    createError, 
    Validator 
} from '../errors';

const logger = createLogger(configService);

export class AuthService {
    private readonly saltRounds = 12;
    private readonly jwtSecret: string;
    private readonly jwtExpiryTime: string;
    private users: Map<string, User> = new Map(); // In-memory storage (replace with database)
    private usersByEmail: Map<string, User> = new Map();
    private usersByUsername: Map<string, User> = new Map();

    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || configService.get<string>('auth.jwtSecret') || 'vr-translate-secret-key';
        this.jwtExpiryTime = process.env.JWT_EXPIRY || configService.get<string>('auth.jwtExpiry') || '7d';
        
        if (this.jwtSecret === 'vr-translate-secret-key') {
            logger.warn('Using default JWT secret. Please set JWT_SECRET environment variable for production.');
        }
    }

    /**
     * Register a new user
     */
    public async register(request: RegisterRequest): Promise<AuthResponse> {
        try {
            // Validate input
            this.validateRegisterRequest(request);

            // Check if user already exists
            if (this.usersByEmail.has(request.email.toLowerCase())) {
                throw createError.validation('Email already registered');
            }

            if (this.usersByUsername.has(request.username.toLowerCase())) {
                throw createError.validation('Username already taken');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(request.password, this.saltRounds);

            // Create default preferences
            const defaultPreferences: UserPreferences = {
                defaultSourceLanguage: 'en',
                defaultTargetLanguage: 'zh',
                memorySettings: DEFAULT_MEMORY_SETTINGS,
                vr: {
                    deviceType: 'quest3',
                    gazeSettings: {
                        stabilityThreshold: 80,
                        timeThreshold: 1500,
                        headGazeMode: true
                    }
                }
            };

            // Create user
            const user: User = {
                id: randomUUID(),
                username: request.username,
                email: request.email.toLowerCase(),
                passwordHash,
                createdAt: new Date(),
                isActive: true,
                preferences: {
                    ...defaultPreferences,
                    ...request.preferences
                }
            };

            // Store user (in real implementation, save to database)
            this.users.set(user.id, user);
            this.usersByEmail.set(user.email, user);
            this.usersByUsername.set(user.username.toLowerCase(), user);

            logger.info('User registered successfully', { 
                userId: user.id, 
                username: user.username,
                email: user.email 
            });

            // Generate JWT token
            const token = this.generateToken(user);
            const expiresAt = this.getTokenExpiry();

            return {
                success: true,
                user: this.sanitizeUser(user),
                token,
                expiresAt
            };

        } catch (error) {
            const appError = ErrorHandler.handle(error as Error);
            logger.error('Registration failed', { 
                error: appError.toJSON(),
                username: request.username,
                email: request.email 
            });
            
            return {
                success: false
            };
        }
    }

    /**
     * Authenticate user login
     */
    public async login(request: LoginRequest): Promise<AuthResponse> {
        try {
            // Validate input
            this.validateLoginRequest(request);

            // Find user by username or email
            const user = this.findUserByUsernameOrEmail(request.username);
            if (!user) {
                throw createError.validation('Invalid username or password');
            }

            if (!user.isActive) {
                throw createError.validation('Account is deactivated');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(request.password, user.passwordHash);
            if (!isPasswordValid) {
                logger.warn('Failed login attempt', { 
                    username: request.username,
                    userId: user.id 
                });
                throw createError.validation('Invalid username or password');
            }

            // Update last login time
            user.lastLoginAt = new Date();
            this.users.set(user.id, user);

            logger.info('User logged in successfully', { 
                userId: user.id, 
                username: user.username 
            });

            // Generate JWT token
            const token = this.generateToken(user);
            const expiresAt = this.getTokenExpiry();

            return {
                success: true,
                user: this.sanitizeUser(user),
                token,
                expiresAt
            };

        } catch (error) {
            const appError = ErrorHandler.handle(error as Error);
            logger.error('Login failed', { 
                error: appError.toJSON(),
                username: request.username 
            });
            
            return {
                success: false
            };
        }
    }

    /**
     * Verify JWT token and return user
     */
    public async verifyToken(token: string): Promise<User | null> {
        try {
            // Verify and decode token
            const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
            
            // Find user
            const user = this.users.get(decoded.userId);
            if (!user || !user.isActive) {
                return null;
            }

            return user;

        } catch (error) {
            logger.debug('Token verification failed', { 
                error: (error as Error).message 
            });
            return null;
        }
    }

    /**
     * Get user by ID
     */
    public async getUserById(userId: string): Promise<User | null> {
        return this.users.get(userId) || null;
    }

    /**
     * Update user preferences
     */
    public async updateUserPreferences(
        userId: string, 
        preferences: Partial<UserPreferences>
    ): Promise<boolean> {
        try {
            const user = this.users.get(userId);
            if (!user) {
                throw createError.validation('User not found');
            }

            // Merge preferences
            user.preferences = {
                ...user.preferences,
                ...preferences
            };

            this.users.set(userId, user);

            logger.info('User preferences updated', { 
                userId, 
                preferences 
            });

            return true;

        } catch (error) {
            logger.error('Failed to update user preferences', { 
                userId, 
                error: (error as Error).message 
            });
            return false;
        }
    }

    /**
     * Deactivate user account
     */
    public async deactivateUser(userId: string): Promise<boolean> {
        try {
            const user = this.users.get(userId);
            if (!user) {
                throw createError.validation('User not found');
            }

            user.isActive = false;
            this.users.set(userId, user);

            logger.info('User account deactivated', { userId });
            return true;

        } catch (error) {
            logger.error('Failed to deactivate user', { 
                userId, 
                error: (error as Error).message 
            });
            return false;
        }
    }

    /**
     * Change user password
     */
    public async changePassword(
        userId: string, 
        oldPassword: string, 
        newPassword: string
    ): Promise<boolean> {
        try {
            const user = this.users.get(userId);
            if (!user) {
                throw createError.validation('User not found');
            }

            // Verify old password
            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
            if (!isOldPasswordValid) {
                throw createError.validation('Current password is incorrect');
            }

            // Validate new password
            this.validatePassword(newPassword);

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);
            user.passwordHash = newPasswordHash;

            this.users.set(userId, user);

            logger.info('User password changed', { userId });
            return true;

        } catch (error) {
            logger.error('Failed to change password', { 
                userId, 
                error: (error as Error).message 
            });
            return false;
        }
    }

    /**
     * Get all users (admin function)
     */
    public async getAllUsers(): Promise<User[]> {
        return Array.from(this.users.values()).map(user => this.sanitizeUser(user));
    }

    /**
     * Get user statistics
     */
    public async getUserStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        recentRegistrations: number;
    }> {
        const allUsers = Array.from(this.users.values());
        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

        return {
            totalUsers: allUsers.length,
            activeUsers: allUsers.filter(u => u.isActive).length,
            recentRegistrations: allUsers.filter(u => 
                u.createdAt.getTime() > weekAgo
            ).length
        };
    }

    private validateRegisterRequest(request: RegisterRequest): void {
        if (!request.username || request.username.length < 3) {
            throw createError.validation('Username must be at least 3 characters long');
        }

        if (!request.email || !this.isValidEmail(request.email)) {
            throw createError.validation('Valid email address is required');
        }

        this.validatePassword(request.password);
    }

    private validateLoginRequest(request: LoginRequest): void {
        if (!request.username) {
            throw createError.validation('Username is required');
        }

        if (!request.password) {
            throw createError.validation('Password is required');
        }
    }

    private validatePassword(password: string): void {
        if (!password || password.length < 8) {
            throw createError.validation('Password must be at least 8 characters long');
        }

        // Check for complexity (at least one number, one uppercase, one lowercase)
        const hasNumber = /\d/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);

        if (!hasNumber || !hasUpper || !hasLower) {
            throw createError.validation(
                'Password must contain at least one number, one uppercase letter, and one lowercase letter'
            );
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private findUserByUsernameOrEmail(usernameOrEmail: string): User | undefined {
        // Try username first
        let user = this.usersByUsername.get(usernameOrEmail.toLowerCase());
        if (user) return user;

        // Try email
        user = this.usersByEmail.get(usernameOrEmail.toLowerCase());
        return user;
    }

    private generateToken(user: User): string {
        const payload: JWTPayload = {
            userId: user.id,
            username: user.username,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this.getTokenExpirySeconds()
        };

        return jwt.sign(payload, this.jwtSecret);
    }

    private getTokenExpirySeconds(): number {
        // Parse expiry time (e.g., "7d", "24h", "3600s")
        const match = this.jwtExpiryTime.match(/^(\d+)([dhms])$/);
        if (!match) return 7 * 24 * 60 * 60; // Default 7 days

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'd': return value * 24 * 60 * 60;
            case 'h': return value * 60 * 60;
            case 'm': return value * 60;
            case 's': return value;
            default: return 7 * 24 * 60 * 60;
        }
    }

    private getTokenExpiry(): Date {
        return new Date(Date.now() + this.getTokenExpirySeconds() * 1000);
    }

    private sanitizeUser(user: User): User {
        // Remove sensitive information before sending to client
        const { passwordHash, ...sanitized } = user;
        return sanitized as User;
    }
}
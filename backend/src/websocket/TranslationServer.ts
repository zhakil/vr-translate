import WebSocket, { WebSocketServer } from 'ws';
import { createLogger } from '../logging/Logger';
import winston from 'winston';
import { GazeAnalyzer } from '../gaze-analyzer/GazeAnalyzer';
import { OCRService } from '../ocr/OCRService';
import { TranslationService } from '../translation/TranslationService';
import { base64ToBuffer } from '../utils';
import configService from '../config/ConfigService';
import { 
    WebSocketMessage, 
    ScreenshotPayload, 
    GazeConfig, 
    GazeData,
    ClientConnection,
    ServiceResponse,
    TranslationResult,
    PerformanceMetrics
} from '../types';
import { 
    AppError, 
    ErrorHandler, 
    Validator, 
    asyncHandler, 
    withTimeout,
    createError
} from '../errors';
import { randomUUID } from 'crypto';
import { AuthService } from '../auth/AuthService';
import { MemoryService } from '../memory/MemoryService';
import { MemoryType, MemoryStatus, MemoryContext } from '../types/memory';

/**
 * Enhanced WebSocket server for VR translation with improved error handling,
 * client management, and performance monitoring.
 */
export class TranslationServer {
    private wss: WebSocketServer;
    private logger: winston.Logger;
    private gazeAnalyzer: GazeAnalyzer;
    private clients: Map<string, ClientConnection> = new Map();
    private metrics: PerformanceMetrics;
    private readonly maxConnections: number = 100;
    private readonly messageTimeout: number = 30000; // 30 seconds

    constructor(
        private port: number,
        private ocrService: OCRService,
        private translationService: TranslationService,
        private authService: AuthService,
        private memoryService: MemoryService
    ) {
        this.logger = createLogger({ get: () => ({ level: 'info', serviceName: 'WebSocketServer' }) } as any);
        this.wss = new WebSocketServer({ 
            port,
            maxPayload: 50 * 1024 * 1024, // 50MB max payload
            perMessageDeflate: true // Enable compression
        });
        this.gazeAnalyzer = new GazeAnalyzer(this.handleGazeTrigger.bind(this));
        this.metrics = this.initializeMetrics();

        this.logger.info(`TranslationServer started on port ${port}`);
        this.initialize();
        this.startMetricsCollection();
    }

    private initializeMetrics(): PerformanceMetrics {
        return {
            requestCount: 0,
            averageProcessingTime: 0,
            errorRate: 0,
            cacheHitRate: 0,
            activeConnections: 0,
            memoryUsage: {
                heapUsed: 0,
                heapTotal: 0,
                external: 0
            }
        };
    }

    private startMetricsCollection(): void {
        setInterval(() => {
            this.updateMetrics();
        }, 60000); // Update every minute
    }

    private updateMetrics(): void {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external
        };
        this.metrics.activeConnections = this.clients.size;
        
        this.logger.debug('Metrics updated', { metrics: this.metrics });
    }

    private initialize(): void {
        this.wss.on('connection', (ws: WebSocket, request) => {
            this.handleNewConnection(ws, request);
        });

        this.wss.on('error', (error: Error) => {
            this.logger.error('WebSocket server error:', { error: error.message });
        });

        // Cleanup interval for inactive connections
        setInterval(() => {
            this.cleanupInactiveConnections();
        }, 300000); // Every 5 minutes
    }

    private handleNewConnection = asyncHandler(async (ws: WebSocket, request: any) => {
        // Check connection limits
        if (this.clients.size >= this.maxConnections) {
            this.logger.warn('Connection limit reached, rejecting new connection');
            ws.close(1013, 'Server overloaded');
            return;
        }

        const clientId = randomUUID();
        const clientConnection: ClientConnection = {
            id: clientId,
            websocket: ws,
            connectedAt: Date.now(),
            lastActivity: Date.now(),
            isActive: true,
            userId: undefined // Will be set after authentication
        };

        this.clients.set(clientId, clientConnection);
        this.logger.info('Client connected', { clientId, totalConnections: this.clients.size });

        // Set up message handling
        ws.on('message', (message: Buffer) => {
            this.handleIncomingMessage(clientId, message);
        });

        ws.on('close', (code: number, reason: Buffer) => {
            this.handleClientDisconnection(clientId, code, reason);
        });

        ws.on('error', (error: Error) => {
            this.handleWebSocketError(clientId, error);
        });

        ws.on('pong', () => {
            this.updateClientActivity(clientId);
        });

        // Send welcome message
        this.sendToClient(clientId, 'connection_established', { 
            clientId, 
            serverTime: Date.now() 
        });
    });

    private handleIncomingMessage = asyncHandler(async (clientId: string, messageBuffer: Buffer) => {
        const startTime = Date.now();
        const client = this.clients.get(clientId);
        
        if (!client || !client.isActive) {
            this.logger.warn('Message from inactive client', { clientId });
            return;
        }

        this.updateClientActivity(clientId);

        try {
            // Validate message size
            if (messageBuffer.length > 50 * 1024 * 1024) { // 50MB limit
                throw createError.validation('Message too large');
            }

            const messageString = messageBuffer.toString('utf8');
            const parsedMessage: WebSocketMessage = JSON.parse(messageString);
            
            // Validate message structure
            Validator.validateWebSocketMessage(parsedMessage);
            
            await this.handleMessage(clientId, parsedMessage);
            
            // Update metrics
            this.metrics.requestCount++;
            const processingTime = Date.now() - startTime;
            this.updateAverageProcessingTime(processingTime);

        } catch (error) {
            this.handleMessageError(clientId, error as Error);
            this.metrics.errorRate = (this.metrics.errorRate + 1) / this.metrics.requestCount;
        }
    });

    private updateAverageProcessingTime(newTime: number): void {
        if (this.metrics.requestCount === 1) {
            this.metrics.averageProcessingTime = newTime;
        } else {
            this.metrics.averageProcessingTime = 
                (this.metrics.averageProcessingTime * (this.metrics.requestCount - 1) + newTime) / 
                this.metrics.requestCount;
        }
    }

    private handleClientDisconnection(clientId: string, code: number, reason: Buffer): void {
        const client = this.clients.get(clientId);
        if (client) {
            client.isActive = false;
            this.clients.delete(clientId);
            this.gazeAnalyzer.reset();
            
            this.logger.info('Client disconnected', { 
                clientId, 
                code, 
                reason: reason.toString(),
                totalConnections: this.clients.size 
            });
        }
    }

    private handleWebSocketError(clientId: string, error: Error): void {
        this.logger.error('WebSocket error for client', { clientId, error: error.message });
        const client = this.clients.get(clientId);
        if (client) {
            client.isActive = false;
        }
    }

    private updateClientActivity(clientId: string): void {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastActivity = Date.now();
        }
    }

    private cleanupInactiveConnections(): void {
        const now = Date.now();
        const inactiveThreshold = 10 * 60 * 1000; // 10 minutes
        
        for (const [clientId, client] of this.clients.entries()) {
            if (now - client.lastActivity > inactiveThreshold) {
                this.logger.info('Cleaning up inactive connection', { clientId });
                client.websocket.terminate();
                this.clients.delete(clientId);
            }
        }
    }

    private handleMessageError(clientId: string, error: Error): void {
        const appError = ErrorHandler.handle(error);
        this.logger.error('Message handling error', { 
            clientId, 
            error: appError.toJSON() 
        });
        
        this.sendToClient(clientId, 'error', {
            code: appError.code,
            message: appError.message,
            timestamp: Date.now()
        });
    }

    private handleMessage = asyncHandler(async (clientId: string, message: WebSocketMessage): Promise<void> => {
        this.logger.debug(`Received message of type: ${message.type}`, { clientId });
        
        switch (message.type) {
            case 'authenticate':
                await this.handleAuthentication(clientId, message.payload);
                break;
            case 'gaze':
                await this.handleGazeMessage(clientId, message.payload as GazeData);
                break;
            case 'screenshot':
                await this.handleScreenshot(clientId, message.payload as ScreenshotPayload);
                break;
            case 'config':
                await this.handleConfigUpdate(clientId, message.payload as GazeConfig);
                break;
            case 'memory_check':
                await this.handleMemoryCheck(clientId, message.payload);
                break;
            case 'memory_create':
                await this.handleMemoryCreate(clientId, message.payload);
                break;
            case 'memory_update':
                await this.handleMemoryUpdate(clientId, message.payload);
                break;
            case 'memory_query':
                await this.handleMemoryQuery(clientId, message.payload);
                break;
            case 'memory_stats':
                await this.handleMemoryStats(clientId);
                break;
            case 'heartbeat':
                await this.handleHeartbeat(clientId);
                break;
            case 'client_info':
                await this.handleClientInfo(clientId, message.payload);
                break;
            default:
                this.logger.warn(`Unknown message type received: ${message.type}`, { clientId });
                throw createError.validation(`Unknown message type: ${message.type}`);
        }
    });

    private handleGazeMessage = asyncHandler(async (clientId: string, gazeData: GazeData): Promise<void> => {
        if (!Validator.isValidGazeData(gazeData)) {
            throw createError.validation('Invalid gaze data format');
        }

        // Add client context to gaze data
        const enrichedGazeData: GazeData = {
            ...gazeData,
            timestamp: gazeData.timestamp || Date.now()
        };

        this.gazeAnalyzer.processGaze(enrichedGazeData);
    });

    private handleHeartbeat = asyncHandler(async (clientId: string): Promise<void> => {
        this.sendToClient(clientId, 'heartbeat_ack', { 
            timestamp: Date.now() 
        });
    });

    private handleClientInfo = asyncHandler(async (clientId: string, clientInfo: any): Promise<void> => {
        const client = this.clients.get(clientId);
        if (client) {
            client.deviceInfo = clientInfo.deviceInfo;
            this.logger.info('Client info updated', { clientId, deviceInfo: clientInfo.deviceInfo });
        }
    });

    private handleAuthentication = asyncHandler(async (clientId: string, authPayload: any): Promise<void> => {
        try {
            const client = this.clients.get(clientId);
            if (!client) {
                throw createError.validation('Client not found');
            }

            let user = null;
            
            if (authPayload.token) {
                // Token-based authentication
                user = await this.authService.verifyToken(authPayload.token);
                if (!user) {
                    throw createError.validation('Invalid or expired token');
                }
            } else if (authPayload.username && authPayload.password) {
                // Username/password authentication
                const authResult = await this.authService.login({
                    username: authPayload.username,
                    password: authPayload.password
                });
                
                if (!authResult.success || !authResult.user) {
                    throw createError.validation('Invalid credentials');
                }
                
                user = authResult.user;
            } else {
                throw createError.validation('Authentication credentials required');
            }

            // Set user ID for the client
            client.userId = user.id;
            this.clients.set(clientId, client);

            this.logger.info('Client authenticated successfully', {
                clientId,
                userId: user.id,
                username: user.username
            });

            // Send authentication success response
            this.sendToClient(clientId, 'auth_success', {
                user: {
                    id: user.id,
                    username: user.username,
                    preferences: user.preferences
                }
            });

        } catch (error) {
            this.logger.warn('Authentication failed', {
                clientId,
                error: (error as Error).message
            });

            this.sendToClient(clientId, 'auth_failed', {
                message: (error as Error).message
            });
        }
    });

    private handleMemoryCheck = asyncHandler(async (clientId: string, payload: any): Promise<void> => {
        const client = this.clients.get(clientId);
        if (!client?.userId) {
            throw createError.validation('Authentication required');
        }

        const memoryCheckResult = await this.memoryService.checkMemory(client.userId, {
            content: payload.content,
            sourceLang: payload.sourceLang,
            targetLang: payload.targetLang
        });

        this.sendToClient(clientId, 'memory_check_result', memoryCheckResult);
    });

    private handleMemoryCreate = asyncHandler(async (clientId: string, payload: any): Promise<void> => {
        const client = this.clients.get(clientId);
        if (!client?.userId) {
            throw createError.validation('Authentication required');
        }

        const memoryItem = await this.memoryService.createMemory(client.userId, payload);
        
        this.sendToClient(clientId, 'memory_created', {
            memoryItem: memoryItem
        });
    });

    private handleMemoryUpdate = asyncHandler(async (clientId: string, payload: any): Promise<void> => {
        const client = this.clients.get(clientId);
        if (!client?.userId) {
            throw createError.validation('Authentication required');
        }

        const updatedMemory = await this.memoryService.updateMemory(
            client.userId,
            payload.memoryId,
            payload.updates
        );

        this.sendToClient(clientId, 'memory_updated', {
            memoryItem: updatedMemory
        });
    });

    private handleMemoryQuery = asyncHandler(async (clientId: string, payload: any): Promise<void> => {
        const client = this.clients.get(clientId);
        if (!client?.userId) {
            throw createError.validation('Authentication required');
        }

        const memories = await this.memoryService.queryMemories({
            ...payload,
            userId: client.userId
        });

        this.sendToClient(clientId, 'memory_query_result', {
            memories: memories,
            total: memories.length
        });
    });

    private handleMemoryStats = asyncHandler(async (clientId: string): Promise<void> => {
        const client = this.clients.get(clientId);
        if (!client?.userId) {
            throw createError.validation('Authentication required');
        }

        const stats = await this.memoryService.getMemoryStats(client.userId);
        
        this.sendToClient(clientId, 'memory_stats_result', stats);
    });

    private handleConfigUpdate = asyncHandler(async (clientId: string, config: GazeConfig): Promise<void> => {
        this.logger.info('Received config update from client', { clientId, config });
        
        try {
            // Update GazeAnalyzer settings
            this.gazeAnalyzer.updateConfig(config);

            // Acknowledge the update
            this.sendToClient(clientId, 'config_updated', { 
                status: 'success', 
                received: config,
                timestamp: Date.now()
            });

        } catch (error) {
            throw createError.configuration('Failed to update configuration', { 
                clientId, 
                operation: 'config_update' 
            });
        }
    });

    private handleGazeTrigger = (gazeData: GazeData): void => {
        this.logger.info('Gaze trigger confirmed. Requesting screenshot from clients', { gazeData });
        this.broadcast('request_screenshot', { 
            x: gazeData.x, 
            y: gazeData.y,
            timestamp: Date.now(),
            confidence: gazeData.confidence
        });
    };

    private handleScreenshot = asyncHandler(async (clientId: string, payload: ScreenshotPayload): Promise<void> => {
        const startTime = Date.now();
        const client = this.clients.get(clientId);
        
        this.logger.info('Received screenshot from client', { clientId, hasAuth: !!client?.userId });
        
        try {
            // Validate screenshot payload
            Validator.validateScreenshotPayload(payload);
            
            const imageBuffer = base64ToBuffer(payload.image);
            
            // Notify client of processing start
            this.sendToClient(clientId, 'status', { 
                message: 'Processing screenshot...', 
                stage: 'ocr_start' 
            });
            
            // Perform OCR with timeout
            const ocrResult = await withTimeout(
                this.ocrService.performOCR(imageBuffer),
                15000, // 15 second timeout
                'OCR processing'
            );
            
            if (!ocrResult || ocrResult.trim() === '') {
                this.logger.warn('OCR returned empty text', { clientId });
                this.sendToClient(clientId, 'status', { 
                    message: 'No text found in image', 
                    stage: 'ocr_complete' 
                });
                return;
            }

            // Check memory if user is authenticated
            let memoryCheckResult = null;
            let shouldTranslate = true;
            let cachedTranslation = null;

            if (client?.userId) {
                this.sendToClient(clientId, 'status', { 
                    message: 'Checking memory...', 
                    stage: 'memory_check' 
                });

                memoryCheckResult = await this.memoryService.checkMemory(client.userId, {
                    content: ocrResult,
                    sourceLang: payload.sourceLang,
                    targetLang: payload.targetLang
                });

                shouldTranslate = memoryCheckResult.shouldTranslate;
                cachedTranslation = memoryCheckResult.cachedTranslation;

                this.logger.debug('Memory check completed', {
                    clientId,
                    userId: client.userId,
                    exists: memoryCheckResult.exists,
                    shouldTranslate,
                    hasCached: !!cachedTranslation
                });
            }

            let translatedText: string;
            let fromCache = false;

            if (!shouldTranslate && cachedTranslation) {
                // Use cached translation from memory
                translatedText = cachedTranslation;
                fromCache = true;
                
                this.sendToClient(clientId, 'status', { 
                    message: 'Using cached translation from memory', 
                    stage: 'memory_hit' 
                });
                
                this.logger.info('Using cached translation from memory', {
                    clientId,
                    userId: client?.userId,
                    originalText: ocrResult.substring(0, 50)
                });
            } else {
                // Perform new translation
                this.sendToClient(clientId, 'status', { 
                    message: `Translating text: "${ocrResult}"`, 
                    stage: 'translation_start' 
                });
                
                translatedText = await withTimeout(
                    this.translationService.translateText(ocrResult, payload.sourceLang, payload.targetLang),
                    10000, // 10 second timeout
                    'Text translation'
                );

                // Save to memory if user is authenticated and should translate
                if (client?.userId && shouldTranslate) {
                    try {
                        // Determine memory type based on content length
                        let memoryType = MemoryType.SENTENCE;
                        if (ocrResult.length <= 50) {
                            memoryType = ocrResult.includes(' ') ? MemoryType.PHRASE : MemoryType.WORD;
                        } else if (ocrResult.length > 200) {
                            memoryType = MemoryType.PARAGRAPH;
                        }

                        // Create memory context
                        const memoryContext: MemoryContext = {
                            gazePosition: payload.gazePosition,
                            timestamp: new Date(),
                            deviceInfo: client.deviceInfo,
                            translationTrigger: 'gaze'
                        };

                        const memoryItem = await this.memoryService.createMemory(client.userId, {
                            content: ocrResult,
                            translatedContent: translatedText,
                            sourceLang: payload.sourceLang,
                            targetLang: payload.targetLang,
                            type: memoryType,
                            status: MemoryStatus.TEMPORARY,
                            context: memoryContext,
                            initialDifficulty: 3 // Default difficulty
                        });

                        this.logger.info('Translation saved to memory', {
                            clientId,
                            userId: client.userId,
                            memoryId: memoryItem.id,
                            memoryType
                        });

                    } catch (memoryError) {
                        this.logger.warn('Failed to save translation to memory', {
                            clientId,
                            userId: client?.userId,
                            error: (memoryError as Error).message
                        });
                        // Continue with translation even if memory save fails
                    }
                }
            }

            const processingTime = Date.now() - startTime;
            
            const result: TranslationResult = {
                original: ocrResult,
                translated: translatedText,
                engine: fromCache ? 'memory_cache' : 'configured_engine',
                processingTime,
                cached: fromCache
            };

            this.logger.info('Translation completed successfully', { 
                clientId, 
                userId: client?.userId,
                processingTime,
                originalLength: ocrResult.length,
                translatedLength: translatedText.length,
                fromCache
            });
            
            this.sendToClient(clientId, 'translation_result', result);

        } catch (error) {
            const appError = ErrorHandler.handle(error as Error);
            this.logger.error('Error processing screenshot', { 
                clientId, 
                userId: client?.userId,
                error: appError.toJSON() 
            });
            
            this.sendToClient(clientId, 'error', {
                code: appError.code,
                message: 'Failed to process screenshot',
                details: appError.message,
                timestamp: Date.now()
            });
        } finally {
            // Reset gaze analyzer to be ready for the next fixation
            this.gazeAnalyzer.reset();
        }
    });

    /**
     * Sends a message to a specific client by ID.
     * @param clientId - The client ID.
     * @param type - The message type.
     * @param payload - The message data.
     */
    public sendToClient(clientId: string, type: string, payload: any): boolean {
        const client = this.clients.get(clientId);
        if (!client || !client.isActive) {
            this.logger.warn('Attempted to send message to inactive client', { clientId, type });
            return false;
        }

        const ws = client.websocket;
        if (ws.readyState === WebSocket.OPEN) {
            try {
                const message = JSON.stringify({ 
                    type, 
                    payload,
                    timestamp: Date.now(),
                    clientId 
                });
                ws.send(message);
                return true;
            } catch (error) {
                this.logger.error('Failed to send message to client', { 
                    clientId, 
                    type, 
                    error: (error as Error).message 
                });
                return false;
            }
        } else {
            this.logger.warn('WebSocket not open for client', { 
                clientId, 
                readyState: ws.readyState 
            });
            return false;
        }
    }

    /**
     * Broadcasts a message to all connected clients.
     * @param type - The message type.
     * @param payload - The message data.
     * @param excludeClientId - Optional client ID to exclude from broadcast.
     */
    public broadcast(type: string, payload: any, excludeClientId?: string): number {
        this.logger.info('Broadcasting message to all clients', { 
            type, 
            totalClients: this.clients.size,
            excludeClientId 
        });
        
        let sentCount = 0;
        const message = JSON.stringify({ 
            type, 
            payload,
            timestamp: Date.now()
        });

        for (const [clientId, client] of this.clients.entries()) {
            if (excludeClientId && clientId === excludeClientId) {
                continue;
            }

            if (client.isActive && client.websocket.readyState === WebSocket.OPEN) {
                try {
                    client.websocket.send(message);
                    sentCount++;
                } catch (error) {
                    this.logger.error('Failed to broadcast to client', { 
                        clientId, 
                        error: (error as Error).message 
                    });
                    client.isActive = false;
                }
            }
        }

        this.logger.debug('Broadcast completed', { type, sentCount, totalClients: this.clients.size });
        return sentCount;
    }

    /**
     * Gets current server metrics.
     */
    public getMetrics(): PerformanceMetrics {
        this.updateMetrics();
        return { ...this.metrics };
    }

    /**
     * Gets information about connected clients.
     */
    public getConnectedClients(): ClientConnection[] {
        return Array.from(this.clients.values()).map(client => ({
            ...client,
            websocket: undefined // Don't expose the WebSocket instance
        }));
    }

    /**
     * Gracefully shuts down the server.
     */
    public async shutdown(): Promise<void> {
        this.logger.info('Shutting down WebSocket server...');
        
        // Notify all clients of shutdown
        this.broadcast('server_shutdown', { 
            message: 'Server is shutting down',
            timestamp: Date.now()
        });

        // Close all client connections
        for (const [clientId, client] of this.clients.entries()) {
            try {
                client.websocket.close(1001, 'Server shutdown');
                client.isActive = false;
            } catch (error) {
                this.logger.warn('Error closing client connection during shutdown', { 
                    clientId, 
                    error: (error as Error).message 
                });
            }
        }

        // Clear clients map
        this.clients.clear();

        // Close the server
        return new Promise((resolve) => {
            this.wss.close(() => {
                this.logger.info('WebSocket server shut down complete');
                resolve();
            });
        });
    }

    /**
     * Health check endpoint for monitoring.
     */
    public getHealthStatus(): { status: string; details: any } {
        const memUsage = process.memoryUsage();
        
        return {
            status: this.clients.size < this.maxConnections ? 'healthy' : 'degraded',
            details: {
                activeConnections: this.clients.size,
                maxConnections: this.maxConnections,
                memoryUsage: {
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
                },
                uptime: process.uptime(),
                metrics: this.metrics
            }
        };
    }
}
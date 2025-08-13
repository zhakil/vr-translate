/**
 * Centralized service manager for the VR Translation backend.
 * Manages lifecycle, health monitoring, and coordination of all services.
 */

import { EventEmitter } from 'events';
import { createLogger } from '../logging/Logger';
import configService from '../config/ConfigService';
import winston from 'winston';
import { OCRService } from '../ocr/OCRService';
import { TranslationService } from '../translation/TranslationService';
import { TranslationServer } from '../websocket/TranslationServer';
import { HttpServer } from '../http/HttpServer';
import { AuthService } from '../auth/AuthService';
import { MemoryService } from '../memory/MemoryService';
import { HealthStatus, ServiceHealth, PerformanceMetrics } from '../types';
import { AppError, ErrorHandler, ErrorCode } from '../errors';

export enum ServiceState {
    STOPPED = 'stopped',
    STARTING = 'starting',
    RUNNING = 'running',
    STOPPING = 'stopping',
    ERROR = 'error'
}

export interface ServiceConfig {
    httpPort: number;
    websocketPort: number;
    enableHealthCheck: boolean;
    shutdownTimeout: number;
}

/**
 * Centralized service manager with health monitoring and graceful shutdown.
 */
export class ServiceManager extends EventEmitter {
    private logger: winston.Logger;
    private state: ServiceState = ServiceState.STOPPED;
    private services: Map<string, any> = new Map();
    private healthCheckInterval?: NodeJS.Timeout;
    private config: ServiceConfig;

    // Service instances
    private ocrService!: OCRService;
    private translationService!: TranslationService;
    private authService!: AuthService;
    private memoryService!: MemoryService;
    private translationServer!: TranslationServer;
    private httpServer!: HttpServer;

    constructor() {
        super();
        this.logger = createLogger(configService);
        this.config = this.loadConfig();
        this.setupSignalHandlers();
    }

    private loadConfig(): ServiceConfig {
        return {
            httpPort: configService.get<number>('server.port') || 3000,
            websocketPort: configService.get<number>('server.websocketPort') || 8080,
            enableHealthCheck: configService.get<boolean>('server.enableHealthCheck') ?? true,
            shutdownTimeout: configService.get<number>('server.shutdownTimeout') || 30000
        };
    }

    private setupSignalHandlers(): void {
        process.on('SIGTERM', () => {
            this.logger.info('Received SIGTERM, initiating graceful shutdown');
            this.shutdown();
        });

        process.on('SIGINT', () => {
            this.logger.info('Received SIGINT, initiating graceful shutdown');
            this.shutdown();
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Promise Rejection', { reason, promise });
            this.emit('error', new AppError('Unhandled Promise Rejection', ErrorCode.UNHANDLED_REJECTION, 500, false));
        });

        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception', { error });
            this.emit('error', new AppError('Uncaught Exception', ErrorCode.UNCAUGHT_EXCEPTION, 500, false));
            process.exit(1);
        });
    }

    /**
     * Starts all services in the correct order.
     */
    public async start(): Promise<void> {
        if (this.state !== ServiceState.STOPPED) {
            throw new AppError(`Cannot start services from state: ${this.state}`);
        }

        this.setState(ServiceState.STARTING);
        this.logger.info('Starting VR Translation Service Manager...');

        try {
            // Initialize core services first
            await this.initializeCoreServices();
            
            // Start HTTP server
            await this.startHttpServer();
            
            // Start WebSocket server
            await this.startWebSocketServer();
            
            // Start health monitoring
            if (this.config.enableHealthCheck) {
                this.startHealthMonitoring();
            }

            this.setState(ServiceState.RUNNING);
            this.logger.info('All services started successfully');
            this.emit('started');

        } catch (error) {
            this.setState(ServiceState.ERROR);
            const appError = ErrorHandler.handle(error as Error);
            this.logger.error('Failed to start services', { error: appError.toJSON() });
            this.emit('error', appError);
            throw appError;
        }
    }

    private async initializeCoreServices(): Promise<void> {
        this.logger.info('Initializing core services...');

        // Initialize Authentication Service
        this.authService = new AuthService();
        this.services.set('auth', this.authService);
        this.logger.info('Authentication Service initialized');

        // Initialize Memory Service
        this.memoryService = new MemoryService();
        this.services.set('memory', this.memoryService);
        this.logger.info('Memory Service initialized');

        // Initialize OCR Service
        this.ocrService = new OCRService();
        this.services.set('ocr', this.ocrService);
        this.logger.info('OCR Service initialized');

        // Initialize Translation Service
        this.translationService = new TranslationService();
        this.services.set('translation', this.translationService);
        this.logger.info('Translation Service initialized');
    }

    private async startHttpServer(): Promise<void> {
        this.logger.info(`Starting HTTP server on port ${this.config.httpPort}...`);
        
        this.httpServer = new HttpServer(this.config.httpPort, this.memoryService);
        this.services.set('http', this.httpServer);
        
        // Add health check endpoint
        this.httpServer.addHealthCheckHandler(() => this.getHealthStatus());
        
        await this.httpServer.start();
        this.logger.info('HTTP Server started successfully');
    }

    private async startWebSocketServer(): Promise<void> {
        this.logger.info(`Starting WebSocket server on port ${this.config.websocketPort}...`);
        
        this.translationServer = new TranslationServer(
            this.config.websocketPort,
            this.ocrService,
            this.translationService,
            this.authService,
            this.memoryService
        );
        this.services.set('websocket', this.translationServer);
        
        this.logger.info('WebSocket Server started successfully');
    }

    private startHealthMonitoring(): void {
        this.healthCheckInterval = setInterval(() => {
            const health = this.getHealthStatus();
            
            if (health.status === 'unhealthy') {
                this.logger.warn('System health check failed', { health });
                this.emit('unhealthy', health);
            }
            
            this.emit('health_check', health);
        }, 30000); // Check every 30 seconds

        this.logger.info('Health monitoring started');
    }

    /**
     * Gracefully shuts down all services.
     */
    public async shutdown(): Promise<void> {
        if (this.state === ServiceState.STOPPING || this.state === ServiceState.STOPPED) {
            return;
        }

        this.setState(ServiceState.STOPPING);
        this.logger.info('Initiating graceful shutdown...');

        const shutdownPromises: Promise<void>[] = [];

        try {
            // Stop health monitoring
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
            }

            // Shutdown WebSocket server first (stop new connections)
            if (this.translationServer) {
                shutdownPromises.push(this.translationServer.shutdown());
            }

            // Shutdown HTTP server
            if (this.httpServer) {
                shutdownPromises.push(this.httpServer.stop());
            }

            // Wait for all shutdowns with timeout
            await Promise.race([
                Promise.all(shutdownPromises),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Shutdown timeout')), this.config.shutdownTimeout);
                })
            ]);

            this.setState(ServiceState.STOPPED);
            this.logger.info('Graceful shutdown completed');
            this.emit('stopped');

        } catch (error) {
            this.logger.error('Error during shutdown', { error });
            this.setState(ServiceState.ERROR);
            this.emit('error', ErrorHandler.handle(error as Error));
            
            // Force exit if graceful shutdown fails
            setTimeout(() => {
                this.logger.error('Force exiting after failed graceful shutdown');
                process.exit(1);
            }, 5000);
        }
    }

    /**
     * Gets the current health status of all services.
     */
    public getHealthStatus(): HealthStatus {
        const now = Date.now();
        const startTime = process.hrtime();

        const serviceHealth = {
            http: this.checkServiceHealth('http'),
            websocket: this.checkServiceHealth('websocket'),
            translation: this.checkServiceHealth('translation'),
            ocr: this.checkServiceHealth('ocr'),
            auth: this.checkServiceHealth('auth'),
            memory: this.checkServiceHealth('memory')
        };

        // Determine overall status
        const allHealthy = Object.values(serviceHealth).every(s => s.status === 'up');
        const anyDown = Object.values(serviceHealth).some(s => s.status === 'down');
        
        const overallStatus = anyDown ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded';

        return {
            status: overallStatus,
            services: serviceHealth,
            timestamp: now,
            uptime: process.uptime()
        };
    }

    private checkServiceHealth(serviceName: string): ServiceHealth {
        const service = this.services.get(serviceName);
        const now = Date.now();

        if (!service) {
            return {
                status: 'down',
                lastCheck: now,
                details: 'Service not found'
            };
        }

        try {
            // Service-specific health checks
            switch (serviceName) {
                case 'websocket':
                    const wsHealth = this.translationServer.getHealthStatus();
                    return {
                        status: wsHealth.status === 'healthy' ? 'up' : 'degraded',
                        lastCheck: now,
                        responseTime: 0,
                        details: wsHealth.details
                    };
                
                case 'http':
                    return {
                        status: this.httpServer ? 'up' : 'down',
                        lastCheck: now,
                        responseTime: 0
                    };
                
                default:
                    return {
                        status: 'up',
                        lastCheck: now,
                        responseTime: 0
                    };
            }
        } catch (error) {
            return {
                status: 'down',
                lastCheck: now,
                details: (error as Error).message
            };
        }
    }

    /**
     * Gets performance metrics from all services.
     */
    public getMetrics(): PerformanceMetrics {
        const wsMetrics = this.translationServer?.getMetrics();
        
        return {
            requestCount: wsMetrics?.requestCount || 0,
            averageProcessingTime: wsMetrics?.averageProcessingTime || 0,
            errorRate: wsMetrics?.errorRate || 0,
            cacheHitRate: wsMetrics?.cacheHitRate || 0,
            activeConnections: wsMetrics?.activeConnections || 0,
            memoryUsage: wsMetrics?.memoryUsage || {
                heapUsed: process.memoryUsage().heapUsed,
                heapTotal: process.memoryUsage().heapTotal,
                external: process.memoryUsage().external
            }
        };
    }

    /**
     * Gets information about connected clients.
     */
    public getConnectedClients() {
        return this.translationServer?.getConnectedClients() || [];
    }

    /**
     * Gets the current state of the service manager.
     */
    public getState(): ServiceState {
        return this.state;
    }

    /**
     * Restarts a specific service.
     */
    public async restartService(serviceName: string): Promise<void> {
        this.logger.info(`Restarting service: ${serviceName}`);
        
        // Implementation depends on service type
        // This is a placeholder for service-specific restart logic
        
        this.emit('service_restarted', { serviceName });
    }

    private setState(newState: ServiceState): void {
        const oldState = this.state;
        this.state = newState;
        
        this.logger.info('Service manager state changed', { 
            from: oldState, 
            to: newState 
        });
        
        this.emit('state_changed', { from: oldState, to: newState });
    }

    /**
     * Performs a rolling restart of services.
     */
    public async rollingRestart(): Promise<void> {
        this.logger.info('Performing rolling restart...');
        
        // Restart services one by one to maintain availability
        const serviceNames = ['ocr', 'translation', 'websocket'];
        
        for (const serviceName of serviceNames) {
            await this.restartService(serviceName);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between restarts
        }
        
        this.logger.info('Rolling restart completed');
        this.emit('rolling_restart_completed');
    }
}
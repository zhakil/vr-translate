import { createLogger } from './logging/Logger';
import configService from './config/ConfigService';
import { ServiceManager } from './services/ServiceManager';
import { AppError, ErrorHandler } from './errors';

// Create a top-level logger for the main application
const logger = createLogger(configService);

/**
 * Main application entry point with improved error handling and service management.
 */
async function main(): Promise<void> {
    logger.info('Starting VR Translation Service...');

    const serviceManager = new ServiceManager();

    // Set up service manager event handlers
    serviceManager.on('started', () => {
        logger.info('All services started successfully');
    });

    serviceManager.on('stopped', () => {
        logger.info('All services stopped successfully');
        process.exit(0);
    });

    serviceManager.on('error', (error: AppError) => {
        logger.error('Service manager error:', { error: error.toJSON() });
        
        if (!ErrorHandler.isOperationalError(error)) {
            logger.error('Non-operational error detected, exiting...');
            process.exit(1);
        }
    });

    serviceManager.on('unhealthy', (health) => {
        logger.warn('System health degraded:', { health });
    });

    serviceManager.on('state_changed', ({ from, to }) => {
        logger.info('Service manager state changed:', { from, to });
    });

    try {
        // Start all services
        await serviceManager.start();
        
        // Log successful startup with configuration info
        logger.info('VR Translation Service started successfully', {
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        });

    } catch (error) {
        const appError = ErrorHandler.handle(error as Error);
        logger.error('Failed to start VR Translation Service:', { 
            error: appError.toJSON() 
        });
        
        // Attempt graceful shutdown
        try {
            await serviceManager.shutdown();
        } catch (shutdownError) {
            logger.error('Failed to shutdown gracefully:', { 
                error: (shutdownError as Error).message 
            });
        }
        
        process.exit(1);
    }
}

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', { 
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise 
    });
    
    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
        logger.error('Unhandled rejection in production, exiting...');
        process.exit(1);
    }
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { 
        error: error.message,
        stack: error.stack 
    });
    
    // Always exit on uncaught exceptions
    process.exit(1);
});

// Graceful shutdown on SIGTERM/SIGINT (handled by ServiceManager)
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal');
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT signal');
});

// Log process warnings
process.on('warning', (warning) => {
    logger.warn('Process warning:', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
    });
});

// Start the application
main().catch((error) => {
    logger.error('Fatal error in main:', { 
        error: error instanceof Error ? error.message : error 
    });
    process.exit(1);
});
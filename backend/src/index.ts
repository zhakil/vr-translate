import { createLogger } from './logging/Logger';
import configService from './config/ConfigService';
import { TranslationServer } from './websocket/TranslationServer';
import { HttpServer } from './http/HttpServer';
import ocrService from './ocr/OCRService';
import translationService from './translation/TranslationService';
import { AppError } from './utils';

// Create a top-level logger for the main application
const logger = createLogger(configService);

function main() {
    logger.info('Initializing VR Translation Service...');

    try {
        // Get server configuration
        const httpPort = configService.get<number>('server.port');
        const websocketPort = configService.get<number>('server.websocketPort');

        // The services (OCR, Translation) are already instantiated as singletons,
        // so we can just import and use them directly.

        // Create and start the HTTP server
        const httpServer = new HttpServer(httpPort);
        httpServer.start();

        // Create and start the WebSocket server
        new TranslationServer(websocketPort, ocrService, translationService);

        logger.info('Service initialized successfully.');

    } catch (error) {
        if (error instanceof AppError) {
            logger.error(`A configuration error occurred: ${error.message}`);
        } else {
            logger.error('An unexpected error occurred during startup.', { error });
        }
        // Exit the process if initialization fails, as the app cannot run.
        process.exit(1);
    }
}

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
    // Optionally, exit the process. It's often safer to restart.
    // process.exit(1);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception thrown:', { error });
    // It is critical to exit the process after an uncaught exception.
    process.exit(1);
});

// Start the application
main();
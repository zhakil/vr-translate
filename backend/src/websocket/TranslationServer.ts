import WebSocket, { WebSocketServer } from 'ws';
import { createLogger, LoggerOptions } from '../logging/Logger';
import winston from 'winston';
import { GazeAnalyzer, GazeData } from '../gaze-analyzer/GazeAnalyzer';
import { OCRService } from '../ocr/OCRService';
import { TranslationService } from '../translation/TranslationService';
import { base64ToBuffer } from '../utils';
import configService from '../config/ConfigService';

// Define the structure of incoming WebSocket messages
interface WebSocketMessage {
    type: 'gaze' | 'screenshot' | 'config';
    payload: any;
}

/**
 * Manages the WebSocket server, client connections, and message routing.
 */
export class TranslationServer {
    private wss: WebSocketServer;
    private logger: winston.Logger;
    private gazeAnalyzer: GazeAnalyzer;

    constructor(
        private port: number,
        private ocrService: OCRService,
        private translationService: TranslationService
    ) {
        this.logger = createLogger({ get: () => ({ level: 'info', serviceName: 'WebSocketServer' }) } as any);
        this.wss = new WebSocketServer({ port });
        this.gazeAnalyzer = new GazeAnalyzer(this.handleGazeTrigger.bind(this));

        this.logger.info(`TranslationServer started on port ${port}`);
        this.initialize();
    }

    private initialize(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            this.logger.info('Client connected.');

            ws.on('message', (message: Buffer) => {
                try {
                    const parsedMessage: WebSocketMessage = JSON.parse(message.toString());
                    this.handleMessage(ws, parsedMessage);
                } catch (error) {
                    this.logger.error('Failed to parse incoming message or handle it.', { error });
                    this.sendMessage(ws, 'error', { message: 'Invalid message format.' });
                }
            });

            ws.on('close', () => {
                this.logger.info('Client disconnected.');
                this.gazeAnalyzer.reset();
            });

            ws.on('error', (error: Error) => {
                this.logger.error('WebSocket error observed:', { error });
            });
        });
    }

    private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
        this.logger.debug(`Received message of type: ${message.type}`);
        switch (message.type) {
            case 'gaze':
                this.gazeAnalyzer.processGaze(message.payload as GazeData);
                break;
            case 'screenshot':
                this.handleScreenshot(ws, message.payload);
                break;
            case 'config':
                this.handleConfigUpdate(message.payload);
                break;
            default:
                this.logger.warn(`Unknown message type received: ${message.type}`);
                this.sendMessage(ws, 'error', { message: `Unknown message type: ${message.type}` });
        }
    }

    private handleConfigUpdate(config: any): void {
        this.logger.info('Received config update from client.', { config });
        // Update GazeAnalyzer settings
        if (config.gaze) {
            this.gazeAnalyzer.updateConfig(config.gaze);
        }

        // Update general settings in ConfigService
        if (config.translation) {
            configService.set('translation', config.translation);
            this.logger.info('In-memory translation config updated.', { newConfig: config.translation });
        }

        // Acknowledge the update
        this.broadcast('config_updated', { status: 'success', received: config });
    }

    private handleGazeTrigger(gazeData: GazeData): void {
        this.logger.info('Gaze trigger confirmed. Requesting screenshot from client.', { gazeData });
        this.broadcast('request_screenshot', { x: gazeData.x, y: gazeData.y });
    }

    private async handleScreenshot(ws: WebSocket, payload: { image: string, sourceLang: string, targetLang: string }): Promise<void> {
        this.logger.info('Received screenshot from client.');
        try {
            const imageBuffer = base64ToBuffer(payload.image);
            
            this.sendMessage(ws, 'status', { message: 'Performing OCR...' });
            const ocrText = await this.ocrService.performOCR(imageBuffer);
            
            if (!ocrText || ocrText.trim() === '') {
                this.logger.warn('OCR returned empty text. Nothing to translate.');
                this.sendMessage(ws, 'status', { message: 'No text found.' });
                return;
            }

            this.sendMessage(ws, 'status', { message: `Translating text: "${ocrText}"` });
            const translatedText = await this.translationService.translateText(ocrText, payload.sourceLang, payload.targetLang);

            this.logger.info(`Sending translation to client: "${translatedText}"`);
            this.sendMessage(ws, 'translation_result', {
                original: ocrText,
                translation: translatedText,
            });

        } catch (error) {
            this.logger.error('Error processing screenshot:', { error });
            this.sendMessage(ws, 'error', { message: 'Failed to process screenshot.', details: (error as Error).message });
        } finally {
            // Reset gaze analyzer to be ready for the next fixation
            this.gazeAnalyzer.reset();
        }
    }

    /**
     * Sends a message to a specific client.
     * @param ws - The WebSocket client instance.
     * @param type - The message type.
     * @param payload - The message data.
     */
    public sendMessage(ws: WebSocket, type: string, payload: any): void {
        if (ws.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({ type, payload });
            ws.send(message);
        }
    }

    /**
     * Broadcasts a message to all connected clients.
     * @param type - The message type.
     * @param payload - The message data.
     */
    public broadcast(type: string, payload: any): void {
        this.logger.info(`Broadcasting message type ${type} to all clients.`);
        const message = JSON.stringify({ type, payload });
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}
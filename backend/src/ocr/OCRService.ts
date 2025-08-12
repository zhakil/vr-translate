import { createLogger } from '../logging/Logger';

const logger = createLogger({ get: () => ({ level: 'info', serviceName: 'OCRService' }) } as any);

/**
 * Interface for an OCR (Optical Character Recognition) engine.
 * This allows for different OCR implementations to be used interchangeably.
 */
export interface IOCREngine {
    /**
     * Recognizes text from an image buffer.
     * @param imageBuffer - The buffer containing the image data.
     * @returns A promise that resolves to the recognized text.
     */
    recognize(imageBuffer: Buffer): Promise<string>;
}

/**
 * A mock OCR engine for testing and development.
 * It simulates a delay and returns a hardcoded text result.
 */
class MockOCREngine implements IOCREngine {
    public async recognize(imageBuffer: Buffer): Promise<string> {
        logger.info('Mock OCR engine received image buffer for recognition.');
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        const mockText = "This is a mock OCR result from the server.";
        logger.info(`Mock OCR engine produced text: \"${mockText}\"
`);
        return mockText;
    }
}

/**
 * Service responsible for handling OCR tasks.
 * It uses a configured OCR engine to perform text recognition.
 */
export class OCRService {
    private engine: IOCREngine;

    constructor(engine?: IOCREngine) {
        // In a real application, you might select the engine based on config
        this.engine = engine || new MockOCREngine();
        logger.info('OCRService initialized.');
    }

    /**
     * Performs OCR on the given image buffer.
     * @param imageBuffer - The image data.
     * @returns The recognized text.
     */
    public async performOCR(imageBuffer: Buffer): Promise<string> {
        try {
            const text = await this.engine.recognize(imageBuffer);
            return text;
        } catch (error) {
            logger.error('Error performing OCR', { error });
            throw new Error('Failed to recognize text from image.');
        }
    }
}

// Export a singleton instance
const ocrService = new OCRService();
export default ocrService;
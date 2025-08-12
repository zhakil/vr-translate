import { createLogger } from '../logging/Logger';
import configService from '../config/ConfigService';
import { DeepLEngine } from './engines/DeepLEngine';

const logger = createLogger(configService);

/**
 * Interface for a translation engine.
 * This allows for different translation providers to be used interchangeably.
 */
export interface ITranslationEngine {
    /**
     * Translates text from a source language to a target language.
     * @param text - The text to translate.
     * @param sourceLang - The source language code (e.g., 'en').
     * @param targetLang - The target language code (e.g., 'es').
     * @returns A promise that resolves to the translated text.
     */
    translate(text: string, sourceLang: string, targetLang: string): Promise<string>;

    /**
     * Batch translate multiple texts (optional, fallback to individual translate)
     * @param texts - Array of texts to translate
     * @param sourceLang - The source language code
     * @param targetLang - The target language code
     * @returns A promise that resolves to an array of translated texts
     */
    batchTranslate?(texts: string[], sourceLang: string, targetLang: string): Promise<string[]>;
}

/**
 * A mock translation engine for testing and development.
 * It simulates a delay and returns a hardcoded translated string.
 */
class MockTranslationEngine implements ITranslationEngine {
    public async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
        logger.info(`Mock translating "${text}" from ${sourceLang} to ${targetLang}.`);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200));
        const translatedText = `(Translated from ${sourceLang} to ${targetLang}) ${text}`;
        logger.info(`Mock translation result: "${translatedText}"`);
        return translatedText;
    }
}

/**
 * Service responsible for handling text translation.
 * It uses a configured translation engine.
 */
export class TranslationService {
    private engine: ITranslationEngine;
    private cache: Map<string, string> = new Map();

    constructor(engine?: ITranslationEngine) {
        if (engine) {
            this.engine = engine;
        } else {
            // 根据配置选择翻译引擎
            const translationEngine = process.env.TRANSLATION_ENGINE || configService.get<string>('translation.engine') || 'mock';
            
            switch (translationEngine.toLowerCase()) {
                case 'deepl':
                    try {
                        this.engine = new DeepLEngine();
                        logger.info('TranslationService initialized with DeepL engine.');
                    } catch (error) {
                        logger.warn('Failed to initialize DeepL engine, falling back to mock:', error);
                        this.engine = new MockTranslationEngine();
                    }
                    break;
                case 'mock':
                default:
                    this.engine = new MockTranslationEngine();
                    logger.info('TranslationService initialized with mock engine.');
                    break;
            }
        }
    }

    /**
     * Translates text, using a cache to avoid redundant API calls.
     * @param text - The text to translate.
     * @param sourceLang - The source language.
     * @param targetLang - The target language.
     * @returns The translated text.
     */
    public async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
        const cacheKey = `${sourceLang}:${targetLang}:${text}`;
        if (this.cache.has(cacheKey)) {
            logger.info(`Returning cached translation for "${text}".`);
            return this.cache.get(cacheKey)!;
        }

        try {
            const translation = await this.engine.translate(text, sourceLang, targetLang);
            this.cache.set(cacheKey, translation);
            return translation;
        } catch (error) {
            logger.error('Error during translation', { error });
            throw new Error('Failed to translate text.');
        }
    }

    /**
     * 批量翻译文本
     * @param texts - 要翻译的文本数组
     * @param sourceLang - 源语言
     * @param targetLang - 目标语言
     * @returns 翻译结果数组
     */
    public async batchTranslateText(texts: string[], sourceLang: string, targetLang: string): Promise<string[]> {
        try {
            // 如果引擎支持批量翻译，使用批量方法
            if (this.engine.batchTranslate) {
                logger.info(`Batch translating ${texts.length} texts using engine batch method.`);
                return await this.engine.batchTranslate(texts, sourceLang, targetLang);
            } else {
                // 否则逐个翻译
                logger.info(`Batch translating ${texts.length} texts individually.`);
                const results: string[] = [];
                for (const text of texts) {
                    const translation = await this.translateText(text, sourceLang, targetLang);
                    results.push(translation);
                }
                return results;
            }
        } catch (error) {
            logger.error('Error during batch translation', { error });
            throw new Error('Failed to batch translate texts.');
        }
    }
}

// Export a singleton instance
const translationService = new TranslationService();
export default translationService;
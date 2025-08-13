import { Request, Response } from 'express';
import { createLogger } from '../logging/Logger';
import configService from '../config/ConfigService';
import ocrService from '../ocr/OCRService';
import translationService from '../translation/TranslationService';
import { AppError } from '../utils';

/**
 * REST API控制器 - 翻译服务
 * 处理HTTP请求，提供外部调用接口
 */
export class TranslationController {
    private logger = createLogger(configService);

    /**
     * 翻译文本
     * POST /api/translate
     */
    async translateText(req: Request, res: Response): Promise<void> {
        try {
            const { text, sourceLang = 'auto', targetLang = 'zh-CN' } = req.body;

            if (!text || typeof text !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'INVALID_INPUT',
                    message: '文本内容不能为空'
                });
                return;
            }

            this.logger.info(`翻译请求: "${text}" (${sourceLang} → ${targetLang})`);

            const result = await translationService.translateText(text, sourceLang, targetLang);

            res.json({
                success: true,
                data: {
                    original: text,
                    translation: result,
                    sourceLang,
                    targetLang,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            this.logger.error('翻译API错误:', error);
            res.status(500).json({
                success: false,
                error: 'TRANSLATION_FAILED',
                message: '翻译服务暂时不可用'
            });
        }
    }

    /**
     * OCR截图捕获（模拟）
     * POST /api/ocr/capture
     */
    async captureAndOCR(req: Request, res: Response): Promise<void> {
        try {
            const { x = 0, y = 0, width = 200, height = 100 } = req.body;

            this.logger.info(`OCR截图捕获请求: (${x}, ${y}) 区域 ${width}x${height}`);

            // 模拟截图和OCR功能
            // 在真实环境中，这里应该调用屏幕截图和OCR服务
            const mockTexts = [
                'hello world',
                'goodbye', 
                'thank you',
                'please',
                'welcome',
                'hello',
                'help',
                'menu',
                'settings',
                'quit'
            ];

            const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
            this.logger.info(`模拟OCR结果: "${randomText}"`);

            res.json({
                success: true,
                text: randomText,
                coordinates: { x, y, width, height },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('OCR截图捕获API错误:', error);
            res.status(500).json({
                success: false,
                error: 'CAPTURE_OCR_FAILED',
                message: 'OCR截图捕获服务暂时不可用'
            });
        }
    }

    /**
     * OCR识别图片中的文字
     * POST /api/ocr
     */
    async recognizeText(req: Request, res: Response): Promise<void> {
        try {
            const { image, lang = 'auto' } = req.body;

            if (!image || typeof image !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'INVALID_IMAGE',
                    message: '图片数据不能为空'
                });
                return;
            }

            this.logger.info(`OCR识别请求 (语言: ${lang})`);

            // Convert base64 to buffer
            const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const result = await ocrService.performOCR(imageBuffer);

            res.json({
                success: true,
                data: {
                    text: result,
                    language: lang,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            this.logger.error('OCR API错误:', error);
            res.status(500).json({
                success: false,
                error: 'OCR_FAILED',
                message: 'OCR服务暂时不可用'
            });
        }
    }

    /**
     * OCR + 翻译组合服务
     * POST /api/ocr-translate
     */
    async ocrAndTranslate(req: Request, res: Response): Promise<void> {
        try {
            const { image, sourceLang = 'auto', targetLang = 'zh-CN' } = req.body;

            if (!image || typeof image !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'INVALID_IMAGE',
                    message: '图片数据不能为空'
                });
                return;
            }

            this.logger.info(`OCR+翻译请求 (${sourceLang} → ${targetLang})`);

            // OCR识别
            const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const recognizedText = await ocrService.performOCR(imageBuffer);
            
            if (!recognizedText.trim()) {
                res.json({
                    success: true,
                    data: {
                        original: '',
                        translation: '',
                        sourceLang,
                        targetLang,
                        message: '图片中未识别到文字',
                        timestamp: new Date().toISOString()
                    }
                });
                return;
            }

            // 翻译文本
            const translation = await translationService.translateText(recognizedText, sourceLang, targetLang);

            res.json({
                success: true,
                data: {
                    original: recognizedText,
                    translation,
                    sourceLang,
                    targetLang,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            this.logger.error('OCR+翻译API错误:', error);
            res.status(500).json({
                success: false,
                error: 'SERVICE_FAILED',
                message: 'OCR+翻译服务暂时不可用'
            });
        }
    }

    /**
     * 批量翻译
     * POST /api/translate/batch
     */
    async batchTranslate(req: Request, res: Response): Promise<void> {
        try {
            const { texts, sourceLang = 'auto', targetLang = 'zh-CN' } = req.body;

            if (!Array.isArray(texts) || texts.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'INVALID_INPUT',
                    message: 'texts必须是非空数组'
                });
                return;
            }

            if (texts.length > 100) {
                res.status(400).json({
                    success: false,
                    error: 'TOO_MANY_REQUESTS',
                    message: '批量翻译最多支持100条文本'
                });
                return;
            }

            this.logger.info(`批量翻译请求: ${texts.length}条文本 (${sourceLang} → ${targetLang})`);

            // 验证所有文本
            const validTexts: string[] = [];
            const textIndexMap: number[] = [];
            
            for (let i = 0; i < texts.length; i++) {
                if (texts[i] && typeof texts[i] === 'string') {
                    validTexts.push(texts[i]);
                    textIndexMap.push(i);
                }
            }

            // 使用批量翻译服务
            let translations: string[] = [];
            try {
                translations = await translationService.batchTranslateText(validTexts, sourceLang, targetLang);
            } catch (error) {
                // 批量翻译失败，逐个翻译
                this.logger.warn('批量翻译失败，尝试逐个翻译');
                translations = [];
                for (const text of validTexts) {
                    try {
                        const translation = await translationService.translateText(text, sourceLang, targetLang);
                        translations.push(translation);
                    } catch (err) {
                        translations.push(''); // 翻译失败
                    }
                }
            }

            // 构建结果数组
            const results = texts.map((text: string, index: number) => {
                if (!text || typeof text !== 'string') {
                    return {
                        index,
                        original: text,
                        translation: '',
                        error: 'INVALID_TEXT'
                    };
                }
                
                const validIndex = textIndexMap.indexOf(index);
                if (validIndex >= 0 && translations[validIndex]) {
                    return {
                        index,
                        original: text,
                        translation: translations[validIndex],
                        success: true
                    };
                } else {
                    return {
                        index,
                        original: text,
                        translation: '',
                        error: 'TRANSLATION_FAILED'
                    };
                }
            });

            res.json({
                success: true,
                data: {
                    results,
                    total: texts.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => r.error).length,
                    sourceLang,
                    targetLang,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            this.logger.error('批量翻译API错误:', error);
            res.status(500).json({
                success: false,
                error: 'BATCH_TRANSLATION_FAILED',
                message: '批量翻译服务暂时不可用'
            });
        }
    }

    /**
     * 获取支持的语言列表
     * GET /api/languages
     */
    async getLanguages(req: Request, res: Response): Promise<void> {
        try {
            // DeepL支持的语言（基于实际API支持）
            const languages = {
                // 常用语言
                common: [
                    { code: 'zh', name: '中文（简体）', nativeName: '中文' },
                    { code: 'en', name: '英语', nativeName: 'English' },
                    { code: 'ja', name: '日语', nativeName: '日本語' },
                    { code: 'ko', name: '韩语', nativeName: '한국어' },
                    { code: 'fr', name: '法语', nativeName: 'Français' },
                    { code: 'de', name: '德语', nativeName: 'Deutsch' },
                    { code: 'es', name: '西班牙语', nativeName: 'Español' },
                    { code: 'ru', name: '俄语', nativeName: 'Русский' },
                    { code: 'it', name: '意大利语', nativeName: 'Italiano' },
                    { code: 'pt', name: '葡萄牙语', nativeName: 'Português' }
                ],
                // DeepL支持的所有语言
                all: [
                    { code: 'auto', name: '自动检测', nativeName: 'Auto Detect' },
                    { code: 'bg', name: '保加利亚语', nativeName: 'български' },
                    { code: 'cs', name: '捷克语', nativeName: 'čeština' },
                    { code: 'da', name: '丹麦语', nativeName: 'dansk' },
                    { code: 'de', name: '德语', nativeName: 'Deutsch' },
                    { code: 'el', name: '希腊语', nativeName: 'ελληνικά' },
                    { code: 'en', name: '英语', nativeName: 'English' },
                    { code: 'es', name: '西班牙语', nativeName: 'Español' },
                    { code: 'et', name: '爱沙尼亚语', nativeName: 'eesti' },
                    { code: 'fi', name: '芬兰语', nativeName: 'suomi' },
                    { code: 'fr', name: '法语', nativeName: 'Français' },
                    { code: 'hu', name: '匈牙利语', nativeName: 'magyar' },
                    { code: 'it', name: '意大利语', nativeName: 'Italiano' },
                    { code: 'ja', name: '日语', nativeName: '日本語' },
                    { code: 'ko', name: '韩语', nativeName: '한국어' },
                    { code: 'lt', name: '立陶宛语', nativeName: 'lietuvių' },
                    { code: 'lv', name: '拉脱维亚语', nativeName: 'latviešu' },
                    { code: 'nl', name: '荷兰语', nativeName: 'Nederlands' },
                    { code: 'pl', name: '波兰语', nativeName: 'polski' },
                    { code: 'pt', name: '葡萄牙语', nativeName: 'Português' },
                    { code: 'pt-BR', name: '葡萄牙语（巴西）', nativeName: 'Português (Brasil)' },
                    { code: 'ro', name: '罗马尼亚语', nativeName: 'română' },
                    { code: 'ru', name: '俄语', nativeName: 'Русский' },
                    { code: 'sk', name: '斯洛伐克语', nativeName: 'slovenčina' },
                    { code: 'sl', name: '斯洛文尼亚语', nativeName: 'slovenščina' },
                    { code: 'sv', name: '瑞典语', nativeName: 'svenska' },
                    { code: 'zh', name: '中文（简体）', nativeName: '中文' }
                ]
            };

            res.json({
                success: true,
                data: languages
            });

        } catch (error) {
            this.logger.error('获取语言列表错误:', error);
            res.status(500).json({
                success: false,
                error: 'LANGUAGES_FETCH_FAILED',
                message: '获取语言列表失败'
            });
        }
    }

    /**
     * 获取服务统计信息
     * GET /api/stats
     */
    async getStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = {
                service: {
                    name: 'VR Translation Service',
                    version: '1.0.0',
                    uptime: process.uptime(),
                    status: 'running'
                },
                performance: {
                    memoryUsage: process.memoryUsage(),
                    cpuUsage: process.cpuUsage(),
                    responseTime: '< 100ms'
                },
                features: {
                    textTranslation: true,
                    ocrRecognition: true,
                    batchTranslation: true,
                    websocketSupport: true,
                    multiLanguage: true
                },
                limits: {
                    maxTextLength: 10000,
                    maxBatchSize: 100,
                    maxImageSize: '10MB',
                    rateLimit: '1000/hour'
                }
            };

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('获取统计信息错误:', error);
            res.status(500).json({
                success: false,
                error: 'STATS_FETCH_FAILED',
                message: '获取统计信息失败'
            });
        }
    }
}

export default new TranslationController();
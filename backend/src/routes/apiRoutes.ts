import { Router } from 'express';
import translationController from '../controllers/TranslationController';
import { rateLimiter, validateRequest } from '../middleware';

/**
 * API路由配置
 * 所有外部调用的REST API接口
 */
const router = Router();

// 应用中间件
router.use(rateLimiter);

// 翻译相关接口
router.post('/translate', validateRequest(['text']), (req, res) => {
    translationController.translateText(req, res);
});

router.post('/translate/batch', validateRequest(['texts']), (req, res) => {
    translationController.batchTranslate(req, res);
});

// OCR相关接口
router.post('/ocr', validateRequest(['image']), (req, res) => {
    translationController.recognizeText(req, res);
});

// OCR截图捕获接口
router.post('/ocr/capture', (req, res) => {
    translationController.captureAndOCR(req, res);
});

// OCR + 翻译组合接口
router.post('/ocr-translate', validateRequest(['image']), (req, res) => {
    translationController.ocrAndTranslate(req, res);
});

// 系统信息接口
router.get('/languages', (req, res) => {
    translationController.getLanguages(req, res);
});

router.get('/stats', (req, res) => {
    translationController.getStats(req, res);
});

// API文档路由
router.get('/docs', (req, res) => {
    res.json({
        title: 'VR Translation Service API',
        version: '1.0.0',
        description: 'VR眼动翻译服务API文档',
        endpoints: {
            'POST /api/translate': {
                description: '翻译文本',
                parameters: {
                    text: 'string (required) - 要翻译的文本',
                    sourceLang: 'string (optional) - 源语言代码，默认auto',
                    targetLang: 'string (optional) - 目标语言代码，默认zh-CN'
                },
                example: {
                    request: {
                        text: 'Hello World',
                        sourceLang: 'en',
                        targetLang: 'zh-CN'
                    },
                    response: {
                        success: true,
                        data: {
                            original: 'Hello World',
                            translation: '你好世界',
                            sourceLang: 'en',
                            targetLang: 'zh-CN',
                            timestamp: '2025-01-01T00:00:00.000Z'
                        }
                    }
                }
            },
            'POST /api/ocr': {
                description: 'OCR识别图片文字',
                parameters: {
                    image: 'string (required) - Base64编码的图片数据',
                    lang: 'string (optional) - 识别语言，默认auto'
                }
            },
            'POST /api/ocr/capture': {
                description: 'OCR截图捕获（模拟）',
                parameters: {
                    x: 'number (optional) - X坐标，默认0',
                    y: 'number (optional) - Y坐标，默认0',
                    width: 'number (optional) - 宽度，默认200',
                    height: 'number (optional) - 高度，默认100'
                }
            },
            'POST /api/ocr-translate': {
                description: 'OCR识别后翻译',
                parameters: {
                    image: 'string (required) - Base64编码的图片数据',
                    sourceLang: 'string (optional) - 源语言代码，默认auto',
                    targetLang: 'string (optional) - 目标语言代码，默认zh-CN'
                }
            },
            'POST /api/translate/batch': {
                description: '批量翻译',
                parameters: {
                    texts: 'string[] (required) - 要翻译的文本数组',
                    sourceLang: 'string (optional) - 源语言代码，默认auto',
                    targetLang: 'string (optional) - 目标语言代码，默认zh-CN'
                }
            },
            'GET /api/languages': {
                description: '获取支持的语言列表'
            },
            'GET /api/stats': {
                description: '获取服务统计信息'
            }
        },
        websocket: {
            url: 'ws://localhost:8080',
            description: 'WebSocket实时通信接口',
            messageTypes: [
                'gaze - 眼动数据',
                'screenshot - 截图请求',
                'config - 配置更新'
            ]
        },
        rateLimit: '1000 requests per hour',
        authentication: 'None (development mode)'
    });
});

export default router;
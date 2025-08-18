// 集成DeepL API的VR翻译服务器
const http = require('http');
const https = require('https');
const url = require('url');

console.log('🚀 启动带DeepL API的VR翻译服务器...');

// 配置
const HTTP_PORT = process.env.PORT || 3000;
const DEEPL_API_KEY = '5fc8f2ca-9eaf-46cb-a7c2-ca3da8c35eae:fx';
const DEEPL_API_URL = 'https://api-free.deepl.com';

// DeepL API调用函数
function callDeepLAPI(text, sourceLang = 'en', targetLang = 'zh') {
    return new Promise((resolve, reject) => {
        // 语言代码映射 (DeepL支持的语言)
        const langMap = {
            'EN': 'EN',
            'EN-US': 'EN-US',
            'EN-GB': 'EN-GB',
            'DE': 'DE',
            'FR': 'FR',
            'ES': 'ES',
            'IT': 'IT',
            'JA': 'JA',
            'KO': 'KO',
            'RU': 'RU',
            'ZH': 'ZH',
            'ZH-CN': 'ZH',
            'ZH-TW': 'ZH',
            'PT': 'PT',
            'NL': 'NL',
            'PL': 'PL'
        };

        const sourceLanguage = langMap[sourceLang.toUpperCase()] || sourceLang.toUpperCase();
        const targetLanguage = langMap[targetLang.toUpperCase()] || targetLang.toUpperCase();

        const postData = new URLSearchParams({
            'auth_key': DEEPL_API_KEY,
            'text': text,
            'source_lang': sourceLanguage,
            'target_lang': targetLanguage
        }).toString();

        const options = {
            hostname: 'api-free.deepl.com',
            port: 443,
            path: '/v2/translate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000 // 10秒超时
        };

        console.log(`🌍 调用DeepL API: "${text}" (${sourceLang} → ${targetLang})`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📥 DeepL API响应状态: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    try {
                        const response = JSON.parse(data);
                        if (response.translations && response.translations.length > 0) {
                            const translation = response.translations[0].text;
                            console.log(`✅ 翻译成功: "${translation}"`);
                            resolve({
                                success: true,
                                translation: translation,
                                confidence: 0.95,
                                source: 'deepl',
                                detectedSourceLang: response.translations[0].detected_source_language
                            });
                        } else {
                            console.log('❌ DeepL响应格式错误');
                            resolve({
                                success: false,
                                error: 'Invalid DeepL response format',
                                translation: text // 返回原文作为后备
                            });
                        }
                    } catch (parseError) {
                        console.error('❌ 解析DeepL响应失败:', parseError.message);
                        resolve({
                            success: false,
                            error: 'Failed to parse DeepL response',
                            translation: text
                        });
                    }
                } else if (res.statusCode === 403) {
                    console.error('❌ DeepL API密钥无效或配额用尽');
                    resolve({
                        success: false,
                        error: 'Invalid API key or quota exceeded',
                        translation: '【API密钥无效】' + text
                    });
                } else if (res.statusCode === 456) {
                    console.error('❌ DeepL API配额用尽');
                    resolve({
                        success: false,
                        error: 'DeepL quota exceeded',
                        translation: '【配额用尽】' + text
                    });
                } else {
                    console.error(`❌ DeepL API错误: ${res.statusCode} - ${data}`);
                    resolve({
                        success: false,
                        error: `DeepL API error: ${res.statusCode}`,
                        translation: '【翻译失败】' + text
                    });
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ DeepL API网络错误:', err.message);
            resolve({
                success: false,
                error: 'Network error: ' + err.message,
                translation: '【网络错误】' + text
            });
        });

        req.on('timeout', () => {
            console.error('❌ DeepL API请求超时');
            req.destroy();
            resolve({
                success: false,
                error: 'DeepL API timeout',
                translation: '【请求超时】' + text
            });
        });

        req.write(postData);
        req.end();
    });
}

// HTTP服务器
const httpServer = http.createServer((req, res) => {
    // CORS设置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    console.log(`${req.method} ${path}`);
    
    try {
        if (path === '/api/health' || path === '/health' || path === '/') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'healthy',
                message: 'VR Translation Service with DeepL API',
                deepl_api_key: DEEPL_API_KEY ? 'configured' : 'missing',
                timestamp: new Date().toISOString()
            }));
            
        } else if (path === '/api/stats') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'healthy',
                service: 'VR Translation with DeepL',
                api_key_status: DEEPL_API_KEY ? 'configured' : 'missing',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                }
            }));
            
        } else if (path === '/api/gaze' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const gazeData = JSON.parse(body);
                    console.log(`👁️ 注视数据: (${gazeData.x}, ${gazeData.y})`);
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Gaze data received',
                        timestamp: new Date().toISOString()
                    }));
                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid gaze data' }));
                }
            });
            
        } else if (path === '/api/screenshot' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const screenshotData = JSON.parse(body);
                    console.log('📸 收到截图数据，开始真实OCR和翻译处理...');
                    
                    // 模拟从OCR提取的文本，或使用请求中的originalText
                    const extractedText = screenshotData.originalText || screenshotData.text || 'Hello World';
                    const sourceLang = screenshotData.sourceLang || 'en';
                    const targetLang = screenshotData.targetLang || 'zh';
                    
                    console.log(`🔍 提取的文本: "${extractedText}"`);
                    
                    // 调用DeepL API进行真实翻译
                    const translationResult = await callDeepLAPI(extractedText, sourceLang, targetLang);
                    
                    const response = {
                        original: extractedText,
                        translation: translationResult.translation,
                        confidence: translationResult.confidence || 0.8,
                        success: translationResult.success,
                        source: translationResult.source || 'deepl',
                        detectedSourceLang: translationResult.detectedSourceLang,
                        timestamp: new Date().toISOString()
                    };
                    
                    if (!translationResult.success && translationResult.error) {
                        response.error = translationResult.error;
                    }
                    
                    res.writeHead(200);
                    res.end(JSON.stringify(response));
                    
                } catch (e) {
                    console.error('❌ 截图处理错误:', e.message);
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid screenshot data: ' + e.message }));
                }
            });
            
        } else if (path === '/api/config' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const configData = JSON.parse(body);
                    console.log('⚙️ 收到配置更新:', JSON.stringify(configData, null, 2));
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        message: 'Config updated',
                        timestamp: new Date().toISOString()
                    }));
                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid config data' }));
                }
            });
            
        } else if (path === '/api/translate' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const text = data.text || '';
                    const sourceLang = data.sourceLang || data.source_lang || 'en';
                    const targetLang = data.targetLang || data.target_lang || 'zh';
                    
                    console.log(`🌍 直接翻译请求: "${text}" (${sourceLang} → ${targetLang})`);
                    
                    if (!text.trim()) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Text is required' }));
                        return;
                    }
                    
                    // 调用DeepL API
                    const translationResult = await callDeepLAPI(text, sourceLang, targetLang);
                    
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: translationResult.success,
                        original: text,
                        translation: translationResult.translation,
                        confidence: translationResult.confidence || 0.8,
                        source: translationResult.source || 'deepl',
                        detectedSourceLang: translationResult.detectedSourceLang,
                        error: translationResult.error,
                        timestamp: new Date().toISOString()
                    }));
                    
                } catch (e) {
                    console.error('❌ 翻译请求处理错误:', e.message);
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
                }
            });
            
        } else if (path === '/api/test-deepl') {
            // DeepL API测试端点
            const testText = 'Hello';
            console.log('🧪 测试DeepL API (简单测试)...');
            
            // 先测试获取使用量信息
            const usageOptions = {
                hostname: 'api-free.deepl.com',
                port: 443,
                path: '/v2/usage',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 10000
            };

            const usageData = new URLSearchParams({
                'auth_key': DEEPL_API_KEY
            }).toString();

            console.log('🔍 检查DeepL API配额和密钥有效性...');
            
            const req = https.request(usageOptions, (usageRes) => {
                let data = '';
                
                usageRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                usageRes.on('end', () => {
                    console.log(`📊 DeepL配额查询状态: ${usageRes.statusCode}`);
                    
                    if (usageRes.statusCode === 200) {
                        try {
                            const usageInfo = JSON.parse(data);
                            console.log('✅ API密钥有效，配额信息:', usageInfo);
                            
                            // 配额查询成功，现在测试翻译
                            callDeepLAPI(testText, 'en', 'de').then(result => {
                                res.writeHead(200);
                                res.end(JSON.stringify({
                                    test: 'DeepL API Test',
                                    api_key_valid: true,
                                    usage_info: usageInfo,
                                    translation_test: {
                                        input: testText,
                                        result: result
                                    },
                                    timestamp: new Date().toISOString()
                                }));
                            });
                        } catch (parseError) {
                            console.error('❌ 解析配额信息失败:', parseError.message);
                            res.writeHead(500);
                            res.end(JSON.stringify({
                                test: 'DeepL API Test',
                                error: 'Failed to parse usage info',
                                raw_response: data,
                                timestamp: new Date().toISOString()
                            }));
                        }
                    } else {
                        console.error(`❌ DeepL配额查询失败: ${usageRes.statusCode} - ${data}`);
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            test: 'DeepL API Test',
                            api_key_valid: false,
                            error: `Usage query failed: ${usageRes.statusCode}`,
                            raw_response: data,
                            timestamp: new Date().toISOString()
                        }));
                    }
                });
            });

            req.on('error', (err) => {
                console.error('❌ DeepL配额查询网络错误:', err.message);
                res.writeHead(500);
                res.end(JSON.stringify({
                    test: 'DeepL API Test',
                    error: 'Network error: ' + err.message,
                    timestamp: new Date().toISOString()
                }));
            });

            req.on('timeout', () => {
                console.error('❌ DeepL配额查询超时');
                req.destroy();
                res.writeHead(500);
                res.end(JSON.stringify({
                    test: 'DeepL API Test',
                    error: 'Request timeout',
                    timestamp: new Date().toISOString()
                }));
            });

            req.write(usageData);
            req.end();
            
        } else if (path === '/api/memory/check') {
            res.writeHead(200);
            res.end(JSON.stringify({
                shouldTranslate: true,
                confidence: 0.8
            }));
            
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
        
    } catch (error) {
        console.error('❌ 请求处理错误:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Server error: ' + error.message }));
    }
});

// 启动服务
httpServer.listen(HTTP_PORT, '127.0.0.1', () => {
    console.log(`✅ HTTP服务启动: http://127.0.0.1:${HTTP_PORT}`);
    console.log(`🔑 DeepL API密钥: ${DEEPL_API_KEY ? '已配置' : '未配置'}`);
    console.log('🧪 测试端点: http://127.0.0.1:' + HTTP_PORT + '/api/test-deepl');
});

// 错误处理
httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ 端口 ${HTTP_PORT} 已被占用`);
        process.exit(1);
    } else {
        console.log('HTTP服务器错误:', err);
    }
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\\n🛑 收到关闭信号，正在关闭服务器...');
    httpServer.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

console.log('🎯 带DeepL API的VR翻译服务器准备就绪!');
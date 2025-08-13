// 支持DeepL API的VR翻译服务器
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// 检查OCR依赖是否存在
let hasOCR = false;
let Tesseract, sharp;

try {
    Tesseract = require('tesseract.js');
    sharp = require('sharp');
    hasOCR = true;
    console.log('✅ OCR库已加载');
} catch (error) {
    console.log('⚠️ OCR库未安装，使用简单文本提取');
}

console.log('🚀 启动支持DeepL的VR翻译服务器...');

// 加载配置
let config = {};
try {
    const defaultConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'default.json'), 'utf8'));
    let localConfig = {};
    
    try {
        localConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'local.json'), 'utf8'));
    } catch (e) {
        console.log('⚠️ 未找到local.json配置文件，使用默认配置');
    }
    
    // 合并配置
    config = { ...defaultConfig, ...localConfig };
    
    if (config.deepl && config.deepl.apiKey) {
        console.log('✅ 找到DeepL API密钥');
    } else {
        console.log('❌ 未配置DeepL API密钥');
    }
} catch (error) {
    console.error('❌ 配置文件读取错误:', error.message);
    process.exit(1);
}

const HTTP_PORT = config.server?.port || 3000;
const WS_PORT = config.server?.websocketPort || 8080;

// WebSocket帧解析函数 (简化版)
function parseWebSocketFrame(buffer) {
    if (buffer.length < 2) return null;
    
    const firstByte = buffer[0];
    const secondByte = buffer[1];
    
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    
    let offset = 2;
    
    if (payloadLength === 126) {
        if (buffer.length < offset + 2) return null;
        payloadLength = buffer.readUInt16BE(offset);
        offset += 2;
    } else if (payloadLength === 127) {
        if (buffer.length < offset + 8) return null;
        payloadLength = buffer.readBigUInt64BE(offset);
        offset += 8;
    }
    
    let maskingKey;
    if (masked) {
        if (buffer.length < offset + 4) return null;
        maskingKey = buffer.slice(offset, offset + 4);
        offset += 4;
    }
    
    if (buffer.length < offset + payloadLength) return null;
    
    let payload = buffer.slice(offset, offset + Number(payloadLength));
    
    if (masked) {
        for (let i = 0; i < payload.length; i++) {
            payload[i] ^= maskingKey[i % 4];
        }
    }
    
    if (opcode === 0x1) { // 文本帧
        return payload.toString('utf8');
    }
    
    return null;
}

// WebSocket消息发送函数
function sendWebSocketMessage(socket, message) {
    const messageBuffer = Buffer.from(message, 'utf8');
    const length = messageBuffer.length;
    
    let frame;
    if (length < 126) {
        frame = Buffer.allocUnsafe(2);
        frame[0] = 0x81; // FIN + text frame
        frame[1] = length;
    } else if (length < 65536) {
        frame = Buffer.allocUnsafe(4);
        frame[0] = 0x81;
        frame[1] = 126;
        frame.writeUInt16BE(length, 2);
    } else {
        frame = Buffer.allocUnsafe(10);
        frame[0] = 0x81;
        frame[1] = 127;
        frame.writeBigUInt64BE(BigInt(length), 2);
    }
    
    socket.write(Buffer.concat([frame, messageBuffer]));
}

// DeepL已知翻译问题的修正词典
const translationFixes = {
    'hell': '地狱',
    'Hell': '地狱',
    'HELL': '地狱'
};

// OCR功能函数
async function performOCR(imageBuffer) {
    if (!hasOCR) {
        throw new Error('OCR功能未启用，缺少必要依赖');
    }
    
    try {
        console.log('🔍 开始OCR文本识别...');
        
        // 使用sharp优化图像处理
        const processedImage = await sharp(imageBuffer)
            .grayscale()
            .normalize()
            .sharpen()
            .toBuffer();
        
        // 使用Tesseract进行OCR识别
        const { data: { text } } = await Tesseract.recognize(processedImage, 'eng+chi_sim', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`📖 OCR进度: ${Math.round(m.progress * 100)}%`);
                }
            }
        });
        
        const cleanText = text.trim().replace(/\s+/g, ' ');
        console.log(`✅ OCR识别完成: "${cleanText.substring(0, 100)}..."`);
        
        return cleanText;
    } catch (error) {
        console.error('❌ OCR识别失败:', error.message);
        throw new Error('OCR文本识别失败');
    }
}

// 屏幕截图和OCR功能（模拟）
async function captureAndOCR(x, y, width = 200, height = 100) {
    // 这里应该实现屏幕截图功能
    // 由于是浏览器环境，我们返回模拟文本
    console.log(`📸 模拟屏幕截图: (${x}, ${y}) 区域 ${width}x${height}`);
    
    // 模拟一些常见的英文文本
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
    console.log(`📝 模拟OCR结果: "${randomText}"`);
    
    return randomText;
}

// DeepL翻译函数
function translateWithDeepL(text, targetLang = 'ZH', sourceLang = null) {
    return new Promise((resolve, reject) => {
        if (!config.deepl?.apiKey) {
            reject(new Error('DeepL API密钥未配置'));
            return;
        }
        
        // 检查是否是已知的有问题的翻译
        const trimmedText = text.trim();
        console.log(`🔍 检查翻译修正: text="${trimmedText}", targetLang="${targetLang}"`);
        
        if ((targetLang === 'ZH' || targetLang === 'zh') && translationFixes[trimmedText]) {
            console.log(`🔧 使用修正翻译: "${trimmedText}" → "${translationFixes[trimmedText]}"`);
            resolve({
                success: true,
                translation: translationFixes[trimmedText],
                originalText: text,
                confidence: 1.0,
                engine: 'deepl-fixed',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        const params = {
            auth_key: config.deepl.apiKey,
            text: text,
            target_lang: targetLang
        };
        
        // 只在指定了有效源语言时才添加source_lang参数
        // DeepL不支持'auto'，如果不指定则自动检测
        if (sourceLang && sourceLang !== 'auto' && sourceLang !== 'AUTO') {
            params.source_lang = sourceLang;
        }
        
        const postData = new URLSearchParams(params).toString();
        
        const options = {
            hostname: 'api-free.deepl.com',
            port: 443,
            path: '/v2/translate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log(`🔄 正在翻译: "${text}"`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (res.statusCode === 200 && response.translations && response.translations.length > 0) {
                        const translation = response.translations[0].text;
                        console.log(`✅ 翻译成功: "${translation}"`);
                        
                        resolve({
                            success: true,
                            translation: translation,
                            originalText: text,
                            confidence: 1.0,
                            engine: 'deepl',
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        console.error('❌ DeepL API响应错误:', response);
                        reject(new Error(`DeepL API错误: ${response.message || '未知错误'}`));
                    }
                } catch (error) {
                    console.error('❌ DeepL响应解析错误:', error);
                    reject(new Error('响应解析失败'));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ DeepL API请求错误:', error);
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('DeepL API请求超时'));
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
    
    console.log(`${new Date().toISOString()} ${req.method} ${path}`);
    
    try {
        if (path === '/api/health') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'healthy',
                message: 'VR Translation Service with DeepL',
                deepl: config.deepl?.apiKey ? 'configured' : 'not configured',
                timestamp: new Date().toISOString()
            }));
        
        } else if (path === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VR翻译服务 - WebSocket测试</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .connected { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .disconnected { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .message { background: #f8f9fa; padding: 10px; margin: 5px 0; border-left: 3px solid #007bff; }
        button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0056b3; }
        textarea { width: 100%; height: 200px; margin: 10px 0; padding: 10px; }
        input[type="text"] { width: 100%; padding: 8px; margin: 5px 0; }
    </style>
</head>
<body>
    <h1>🚀 VR翻译服务 - WebSocket测试</h1>
    <p>DeepL翻译服务器测试工具</p>
    
    <div id="status" class="status disconnected">
        📡 未连接到WebSocket服务器
    </div>
    
    <div>
        <label for="wsUrl">WebSocket URL:</label>
        <input type="text" id="wsUrl" value="ws://localhost:3000" placeholder="ws://localhost:3000">
        <button onclick="connect()">连接</button>
        <button onclick="disconnect()">断开</button>
    </div>
    
    <h3>📤 发送测试消息</h3>
    <button onclick="sendTestMessage()">发送测试消息</button>
    <button onclick="sendTranslate()">测试翻译</button>
    
    <h3>📥 消息日志</h3>
    <textarea id="messageLog" readonly placeholder="消息日志将显示在这里..."></textarea>
    <button onclick="clearLog()">清空日志</button>
    
    <script>
        let ws = null;
        const statusDiv = document.getElementById('status');
        const messageLog = document.getElementById('messageLog');
        
        function log(message) {
            const timestamp = new Date().toLocaleTimeString();
            messageLog.value += \`[\${timestamp}] \${message}\\n\`;
            messageLog.scrollTop = messageLog.scrollHeight;
        }
        
        function updateStatus(connected, message) {
            if (connected) {
                statusDiv.className = 'status connected';
                statusDiv.innerHTML = '✅ ' + message;
            } else {
                statusDiv.className = 'status disconnected';
                statusDiv.innerHTML = '❌ ' + message;
            }
        }
        
        function connect() {
            const url = document.getElementById('wsUrl').value;
            
            if (ws) {
                ws.close();
            }
            
            try {
                ws = new WebSocket(url);
                
                ws.onopen = function() {
                    updateStatus(true, '已连接到WebSocket服务器');
                    log('WebSocket连接已建立');
                };
                
                ws.onclose = function() {
                    updateStatus(false, '已断开WebSocket连接');
                    log('WebSocket连接已关闭');
                };
                
                ws.onerror = function(error) {
                    updateStatus(false, 'WebSocket连接错误');
                    log('WebSocket错误: ' + error);
                };
                
                ws.onmessage = function(event) {
                    log('收到消息: ' + event.data);
                };
                
            } catch (error) {
                updateStatus(false, '无法连接到WebSocket服务器');
                log('连接失败: ' + error.message);
            }
        }
        
        function disconnect() {
            if (ws) {
                ws.close();
                ws = null;
            }
        }
        
        function sendMessage(message) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
                log('发送消息: ' + JSON.stringify(message, null, 2));
            } else {
                log('错误: WebSocket未连接');
            }
        }
        
        function sendTestMessage() {
            const message = {
                type: 'test',
                payload: {
                    message: 'Hello from test page!',
                    timestamp: Date.now()
                }
            };
            sendMessage(message);
        }
        
        function sendTranslate() {
            const message = {
                type: 'translate',
                payload: {
                    text: 'Hello World',
                    sourceLang: 'en',
                    targetLang: 'zh-CN'
                }
            };
            sendMessage(message);
        }
        
        function clearLog() {
            messageLog.value = '';
        }
        
        // Auto-connect on page load
        window.onload = function() {
            log('页面加载完成，准备连接WebSocket...');
        };
    </script>
</body>
</html>
            `);
            
        } else if (path === '/api/stats') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                },
                deepl: {
                    configured: !!config.deepl?.apiKey,
                    url: config.deepl?.baseUrl || 'not configured'
                }
            }));
            
        } else if (path === '/api/translate' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const text = data.text || data.content || '';
                    const targetLang = data.targetLang || data.target || 'ZH';
                    const sourceLang = data.sourceLang || data.source || 'EN';
                    
                    if (!text.trim()) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ 
                            success: false, 
                            error: '文本不能为空' 
                        }));
                        return;
                    }
                    
                    try {
                        const result = await translateWithDeepL(text, targetLang, sourceLang);
                        res.writeHead(200);
                        res.end(JSON.stringify(result));
                    } catch (translationError) {
                        console.error('翻译失败:', translationError.message);
                        res.writeHead(500);
                        res.end(JSON.stringify({
                            success: false,
                            error: translationError.message,
                            fallback: `[翻译失败] ${text}`,
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (parseError) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'JSON格式错误' 
                    }));
                }
            });
            
        } else if (path === '/api/memory/check') {
            res.writeHead(200);
            res.end(JSON.stringify({
                shouldTranslate: true,
                confidence: 0.8,
                lastSeen: null
            }));
            
        } else if (path === '/api/ocr/capture' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const x = parseInt(data.x) || 0;
                    const y = parseInt(data.y) || 0;
                    const width = parseInt(data.width) || 200;
                    const height = parseInt(data.height) || 100;
                    
                    try {
                        const extractedText = await captureAndOCR(x, y, width, height);
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            success: true,
                            text: extractedText,
                            coordinates: { x, y, width, height },
                            timestamp: new Date().toISOString()
                        }));
                    } catch (ocrError) {
                        console.error('OCR处理失败:', ocrError.message);
                        res.writeHead(500);
                        res.end(JSON.stringify({
                            success: false,
                            error: ocrError.message,
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (parseError) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: '请求参数格式错误' 
                    }));
                }
            });
            
        } else if (path === '/api/ocr/image' && req.method === 'POST') {
            let buffers = [];
            req.on('data', chunk => buffers.push(chunk));
            req.on('end', async () => {
                try {
                    const imageBuffer = Buffer.concat(buffers);
                    
                    if (!hasOCR) {
                        res.writeHead(500);
                        res.end(JSON.stringify({
                            success: false,
                            error: 'OCR功能未启用，请安装tesseract.js和sharp库'
                        }));
                        return;
                    }
                    
                    try {
                        const extractedText = await performOCR(imageBuffer);
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            success: true,
                            text: extractedText,
                            timestamp: new Date().toISOString()
                        }));
                    } catch (ocrError) {
                        console.error('OCR处理失败:', ocrError.message);
                        res.writeHead(500);
                        res.end(JSON.stringify({
                            success: false,
                            error: ocrError.message,
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: '图像数据处理错误' 
                    }));
                }
            });
            
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'API端点未找到' }));
        }
        
    } catch (error) {
        console.error('请求处理错误:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: '服务器内部错误' }));
    }
});

// WebSocket升级处理（通过HTTP服务器）
httpServer.on('upgrade', (req, socket, head) => {
    console.log('WebSocket连接请求');
    const key = req.headers['sec-websocket-key'];
    if (key) {
        const crypto = require('crypto');
        const accept = crypto
            .createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');
        
        socket.write([
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket', 
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${accept}`,
            '', ''
        ].join('\r\n'));
        
        console.log('✅ WebSocket连接成功');
        
        // 处理WebSocket消息
        socket.on('data', (buffer) => {
            try {
                // 解析WebSocket帧 (简化版)
                const message = parseWebSocketFrame(buffer);
                if (message) {
                    console.log('收到WebSocket消息:', message);
                    
                    // 发送响应
                    const response = {
                        type: 'response',
                        payload: {
                            message: 'WebSocket服务器收到消息',
                            echo: message,
                            timestamp: new Date().toISOString()
                        }
                    };
                    
                    sendWebSocketMessage(socket, JSON.stringify(response));
                }
            } catch (error) {
                console.error('WebSocket消息处理错误:', error);
            }
        });
        
        socket.on('close', () => console.log('❌ WebSocket连接关闭'));
        socket.on('error', (err) => console.log('WebSocket错误:', err.message));
    }
});

// 启动服务
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`✅ HTTP服务启动: http://0.0.0.0:${HTTP_PORT}`);
    console.log(`✅ WebSocket服务启动: ws://0.0.0.0:${HTTP_PORT} (通过HTTP服务器升级)`);
    console.log(`📍 DeepL状态: ${config.deepl?.apiKey ? '已配置' : '未配置'}`);
});

// 错误处理
httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ HTTP端口 ${HTTP_PORT} 已被占用`);
        process.exit(1);
    } else {
        console.log('HTTP服务器错误:', err);
    }
});

console.log('🎯 DeepL翻译服务器准备就绪!');
console.log('📝 支持的翻译方向: EN->ZH, ZH->EN, JP->ZH 等');
console.log('🔑 请确保在config/local.json中配置了有效的DeepL API密钥');
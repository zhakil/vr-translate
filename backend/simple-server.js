// 简单稳定的VR翻译服务器
const http = require('http');
const url = require('url');

console.log('🚀 启动VR翻译服务器...');

// 配置
const HTTP_PORT = 3000;
const WS_PORT = 8080;

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
        if (path === '/api/health' || path === '/') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'healthy',
                message: 'VR Translation Service',
                timestamp: new Date().toISOString()
            }));
            
        } else if (path === '/api/stats') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                }
            }));
            
        } else if (path === '/api/translate' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        translation: `翻译结果: ${data.text || ''}`,
                        confidence: 0.9,
                        timestamp: new Date().toISOString()
                    }));
                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            
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
        console.error('请求处理错误:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Server error' }));
    }
});

// WebSocket服务器 (简化版)
const wsServer = http.createServer();
wsServer.on('upgrade', (req, socket, head) => {
    console.log('WebSocket连接请求');
    const key = req.headers['sec-websocket-key'];
    if (key) {
        const accept = require('crypto')
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
        
        socket.on('close', () => console.log('❌ WebSocket连接关闭'));
        socket.on('error', (err) => console.log('WebSocket错误:', err.message));
    }
});

// 启动服务
httpServer.listen(HTTP_PORT, '127.0.0.1', () => {
    console.log(`✅ HTTP服务启动: http://127.0.0.1:${HTTP_PORT}`);
});

wsServer.listen(WS_PORT, '127.0.0.1', () => {
    console.log(`✅ WebSocket服务启动: ws://127.0.0.1:${WS_PORT}`);
});

// 错误处理
httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ 端口 ${HTTP_PORT} 已被占用`);
    } else {
        console.log('HTTP服务器错误:', err);
    }
});

wsServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ 端口 ${WS_PORT} 已被占用`);
    } else {
        console.log('WebSocket服务器错误:', err);
    }
});

console.log('🎯 服务器准备就绪!');
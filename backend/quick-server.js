// 快速启动服务器 - 使用Node.js内置模块
const http = require('http');
const url = require('url');
const querystring = require('querystring');

// 配置
const HTTP_PORT = 3000;
const WS_PORT = 8080;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    // 路由处理
    if (path === '/' || path === '/api/health') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            message: 'VR Translation Service',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        }));
        
    } else if (path === '/api/stats') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            connections: 0,
            version: '1.0.0'
        }));
        
    } else if (path === '/api/translate') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    // 模拟翻译响应
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        translation: `[模拟翻译] ${data.text || '未提供文本'}`,
                        confidence: 0.95,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: '无效的JSON格式' }));
                }
            });
        } else {
            res.writeHead(405);
            res.end(JSON.stringify({ error: '方法不允许' }));
        }
        
    } else if (path === '/api/memory/check') {
        res.writeHead(200);
        res.end(JSON.stringify({
            shouldTranslate: true,
            confidence: 0.8,
            lastSeen: null
        }));
        
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: '页面未找到' }));
    }
});

// 启动HTTP服务器
server.listen(HTTP_PORT, () => {
    console.log(`🚀 VR Translation Service 已启动`);
    console.log(`📍 HTTP服务: http://localhost:${HTTP_PORT}`);
    console.log(`📍 API端点:`);
    console.log(`   - GET  /api/health - 健康检查`);
    console.log(`   - GET  /api/stats  - 系统状态`);
    console.log(`   - POST /api/translate - 翻译接口`);
    console.log(`   - GET  /api/memory/check - 记忆检查`);
    console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
});

// WebSocket服务器 (使用原生实现)
const wsServer = http.createServer();
const clients = new Set();

wsServer.on('upgrade', (request, socket, head) => {
    console.log('WebSocket升级请求');
    
    // 简单的WebSocket握手
    const key = request.headers['sec-websocket-key'];
    const acceptKey = require('crypto')
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
        
    const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '', ''
    ].join('\r\n');
    
    socket.write(responseHeaders);
    clients.add(socket);
    
    console.log(`🔌 新的WebSocket连接 (总连接数: ${clients.size})`);
    
    socket.on('data', (buffer) => {
        try {
            // 简单的WebSocket帧解析 (仅支持文本帧)
            if (buffer.length > 2) {
                const message = buffer.toString('utf8', 6); // 跳过WebSocket帧头
                console.log('收到WebSocket消息:', message);
                
                // Echo响应
                const response = JSON.stringify({
                    type: 'response',
                    message: '服务器已收到消息',
                    timestamp: new Date().toISOString()
                });
                
                // 发送WebSocket响应帧
                const frame = Buffer.alloc(response.length + 2);
                frame[0] = 0x81; // FIN + text frame
                frame[1] = response.length; // payload length
                frame.write(response, 2);
                socket.write(frame);
            }
        } catch (error) {
            console.error('WebSocket消息处理错误:', error);
        }
    });
    
    socket.on('close', () => {
        clients.delete(socket);
        console.log(`❌ WebSocket连接关闭 (剩余连接数: ${clients.size})`);
    });
    
    socket.on('error', (error) => {
        console.error('WebSocket错误:', error);
        clients.delete(socket);
    });
});

// 启动WebSocket服务器
wsServer.listen(WS_PORT, () => {
    console.log(`🔌 WebSocket服务: ws://localhost:${WS_PORT}`);
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});

process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务...');
    server.close();
    wsServer.close();
    process.exit(0);
});

console.log('🎯 服务器就绪，等待连接...');
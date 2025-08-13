import express, { Request, Response } from 'express';
import path from 'path';
import { createLogger } from '../logging/Logger';
import configService from '../config/ConfigService';
import apiRoutes from '../routes/apiRoutes';
import { createMemoryRoutes } from '../routes/memoryRoutes';
import { corsMiddleware, requestLogger, errorHandler } from '../middleware';

/**
 * HTTP Server for health checks and static content
 */
export class HttpServer {
    private app: express.Application;
    private logger: ReturnType<typeof createLogger>;
    private server: any;
    private healthCheckHandler?: () => any;

    constructor(private port: number, private memoryService?: any) {
        this.logger = createLogger(configService);
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        // Request logging
        this.app.use(requestLogger);
        
        // CORS middleware
        this.app.use(corsMiddleware);
        
        // Enable JSON parsing with size limits
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        
        // Security headers to prevent extension interference
        this.app.use((req: Request, res: Response, next) => {
            res.header('X-Frame-Options', 'DENY');
            res.header('X-Content-Type-Options', 'nosniff');
            res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
            next();
        });

        // Static files
        const staticPath = path.join(__dirname, '../../static');
        this.app.use('/static', express.static(staticPath));
        
        // API routes
        this.app.use('/api', apiRoutes);
        
        // Memory API routes (if memory service is available)
        if (this.memoryService) {
            this.app.use('/api/memory', createMemoryRoutes(this.memoryService));
        }
    }

    private setupRoutes(): void {
        // Health check endpoint
        this.app.get('/health', (req: Request, res: Response) => {
            let health = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                services: {
                    websocket: true,
                    ocr: true,
                    translation: true,
                    auth: !!this.memoryService,
                    memory: !!this.memoryService
                }
            };

            // Use external health check handler if available
            if (this.healthCheckHandler) {
                try {
                    const externalHealth = this.healthCheckHandler();
                    health = { ...health, ...externalHealth };
                } catch (error) {
                    this.logger.warn('External health check failed', { error });
                }
            }
            
            res.json(health);
        });

        // API status endpoint
        this.app.get('/api/status', (req: Request, res: Response) => {
            const status = {
                server: 'VR Translation Service',
                status: 'running',
                timestamp: new Date().toISOString(),
                websocket: {
                    port: configService.get('server.websocketPort'),
                    url: `ws://localhost:${configService.get('server.websocketPort')}`
                },
                configuration: {
                    ocrEngine: configService.get('ocr.engine'),
                    translationEngine: configService.get('translation.engine'),
                    logLevel: configService.get('logging.level')
                }
            };
            
            res.json(status);
        });

        // Favicon endpoint to prevent 404 errors
        this.app.get('/favicon.ico', (req: Request, res: Response) => {
            res.status(204).send(); // No content
        });

        // WebSocket test page
        this.app.get('/', (req: Request, res: Response) => {
            const htmlContent = this.getTestPageHTML();
            res.send(htmlContent);
        });

        // 404 handler
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({
                error: 'Not Found',
                message: 'The requested resource was not found',
                availableEndpoints: [
                    'GET /',
                    'GET /health',
                    'GET /api/status',
                    'GET /api/docs',
                    'POST /api/translate',
                    'POST /api/ocr',
                    'POST /api/ocr-translate'
                ]
            });
        });
        
        // Error handling middleware
        this.app.use(errorHandler);
    }

    private getTestPageHTML(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VR Translation Service - WebSocket Test</title>
    <link rel="icon" href="data:,">
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
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; padding: 10px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🚀 VR Translation Service</h1>
    <p>WebSocket连接测试工具</p>
    
    <div class="info">
        <strong>注意:</strong> 如果浏览器控制台显示扩展相关错误，可以忽略，不影响WebSocket测试功能。
    </div>
    
    <div id="status" class="status disconnected">
        📡 未连接到WebSocket服务器
    </div>
    
    <div>
        <label for="wsUrl">WebSocket URL:</label>
        <input type="text" id="wsUrl" value="ws://localhost:8081" placeholder="ws://localhost:8081">
        <button onclick="connect()">连接</button>
        <button onclick="disconnect()">断开</button>
    </div>
    
    <h3>📤 发送测试消息</h3>
    <button onclick="sendGazeData()">发送注视数据</button>
    <button onclick="sendScreenshot()">发送截图请求</button>
    <button onclick="sendConfig()">发送配置更新</button>
    
    <h3>📥 消息日志</h3>
    <textarea id="messageLog" readonly placeholder="消息日志将显示在这里..."></textarea>
    <button onclick="clearLog()">清空日志</button>
    
    <script>
        let ws = null;
        const statusDiv = document.getElementById('status');
        const messageLog = document.getElementById('messageLog');
        
        // Prevent extension interference
        function preventExtensionInterference() {
            if (window.chrome && window.chrome.runtime) {
                console.log('检测到Chrome扩展环境，某些功能可能受到影响');
            }
            
            const originalError = console.error;
            console.error = function(...args) {
                const message = args.join(' ');
                if (message.includes('content_scripts') || 
                    message.includes('extension') || 
                    message.includes('chrome-extension')) {
                    return;
                }
                originalError.apply(console, args);
            };
        }
        
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
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'translation_result') {
                            log(\`翻译结果: "\${message.payload.original}" → "\${message.payload.translation}"\`);
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
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
        
        function sendGazeData() {
            const message = {
                type: 'gaze',
                payload: {
                    x: Math.floor(Math.random() * 800),
                    y: Math.floor(Math.random() * 600),
                    timestamp: Date.now(),
                    confidence: 0.8 + Math.random() * 0.2
                }
            };
            sendMessage(message);
        }
        
        function sendScreenshot() {
            const message = {
                type: 'screenshot',
                payload: {
                    image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                    sourceLang: 'en',
                    targetLang: 'zh-CN'
                }
            };
            sendMessage(message);
        }
        
        function sendConfig() {
            const message = {
                type: 'config',
                payload: {
                    gaze: {
                        threshold: 2.0,
                        radius: 50
                    },
                    translation: {
                        sourceLanguage: 'en',
                        targetLanguage: 'zh-CN'
                    }
                }
            };
            sendMessage(message);
        }
        
        function clearLog() {
            messageLog.value = '';
        }
        
        // Auto-connect on page load
        window.onload = function() {
            preventExtensionInterference();
            log('页面加载完成，准备连接WebSocket...');
            log('如果看到扩展相关错误，可以忽略，不影响WebSocket测试功能');
        };
    </script>
</body>
</html>
        `;
    }

    public start(): void {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
            this.logger.info(`HTTP Server started on port ${this.port}`);
            this.logger.info(`Health check: http://localhost:${this.port}/health`);
            this.logger.info(`WebSocket test: http://localhost:${this.port}/`);
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.logger.info('HTTP Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    public addHealthCheckHandler(handler: () => any): void {
        this.healthCheckHandler = handler;
    }
}
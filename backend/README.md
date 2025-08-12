# VR Translation Service Backend

## 概述

VR眼球注视翻译系统的后端服务，提供WebSocket实时通信、OCR文字识别和翻译服务。

## 技术栈

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **WebSocket**: ws library
- **OCR**: Google Vision API / Tesseract.js
- **Translation**: Google Translate API / DeepL API
- **Logging**: Winston
- **Testing**: Jest
- **Caching**: Node-Cache / Redis

## 项目结构

```
backend/
├── src/                    # 源代码
│   ├── websocket/         # WebSocket服务器
│   ├── gaze-analyzer/     # 注视分析器
│   ├── ocr/              # OCR文字识别
│   ├── translation/      # 翻译服务
│   ├── config/           # 配置管理
│   ├── logging/          # 日志服务
│   ├── utils/            # 工具函数
│   └── index.ts          # 应用入口
├── api/                  # API文档
├── config/               # 配置文件
├── docs/                 # 文档
├── tests/                # 测试文件
├── dist/                 # 编译输出
├── package.json          # 项目配置
└── tsconfig.json         # TypeScript配置
```

## 核心功能模块

### 1. WebSocket服务器 (websocket/)
- 与VR前端建立实时连接
- 消息路由和处理
- 连接管理和错误处理

### 2. 注视分析器 (gaze-analyzer/)
- 分析眼动追踪数据
- 检测注视模式和行为
- 触发翻译请求

### 3. OCR服务 (ocr/)
- 图像文字识别
- 多种OCR引擎支持
- 结果缓存和优化

### 4. 翻译服务 (translation/)
- 多语言翻译支持
- 翻译结果缓存
- 服务提供商管理

### 5. 配置管理 (config/)
- 环境配置管理
- 运行时配置更新
- 设置验证

### 6. 日志服务 (logging/)
- 结构化日志记录
- 日志级别管理
- 错误追踪

## 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- TypeScript >= 5.0.0

## 安装和运行

### 开发环境
```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建项目
npm run build

# 生产环境运行
npm start
```

### 测试
```bash
# 运行测试
npm test

# 监听模式测试
npm run test:watch

# 测试覆盖率
npm run test:coverage
```

### 代码质量
```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 代码格式化
npm run format
```

## 配置说明

### 环境变量
```bash
# 服务器配置
PORT=8080
HOST=localhost
NODE_ENV=development

# WebSocket配置
WS_PORT=8081
WS_HEARTBEAT_INTERVAL=30000

# OCR服务配置
GOOGLE_VISION_API_KEY=your_api_key
TESSERACT_WORKER_COUNT=2

# 翻译服务配置
GOOGLE_TRANSLATE_API_KEY=your_api_key
DEEPL_API_KEY=your_api_key

# 缓存配置
CACHE_TTL=3600
REDIS_URL=redis://localhost:6379

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

### API密钥配置
创建 `.env` 文件并配置以下API密钥：

```bash
# Google Cloud API
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_VISION_API_KEY=your_vision_api_key
GOOGLE_TRANSLATE_API_KEY=your_translate_api_key

# DeepL API (可选)
DEEPL_API_KEY=your_deepl_api_key
DEEPL_API_URL=https://api-free.deepl.com/v2/translate

# Azure Cognitive Services (可选)
AZURE_CV_ENDPOINT=your_endpoint
AZURE_CV_KEY=your_key
AZURE_TRANSLATOR_KEY=your_translator_key
```

## API接口

### WebSocket消息格式
```typescript
// 注视数据消息
{
  "id": "uuid",
  "type": "gaze_data",
  "timestamp": 1234567890,
  "data": {
    "position": [x, y, z],
    "direction": [x, y, z],
    "confidence": 0.95
  }
}

// 翻译请求消息
{
  "id": "uuid",
  "type": "translation_request",
  "timestamp": 1234567890,
  "data": {
    "screenRegion": {
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 50
    },
    "sourceLanguage": "auto",
    "targetLanguage": "zh-CN"
  }
}

// 翻译结果消息
{
  "id": "uuid",
  "type": "translation_result",
  "timestamp": 1234567890,
  "data": {
    "originalText": "Hello World",
    "translatedText": "你好世界",
    "confidence": 0.98,
    "sourceLanguage": "en",
    "targetLanguage": "zh-CN"
  }
}
```

## 性能优化

### 缓存策略
- OCR结果缓存：避免重复识别相同图像
- 翻译结果缓存：减少API调用次数
- 连接池管理：优化数据库和API连接

### 并发处理
- 异步队列：处理高并发翻译请求
- 连接池：管理WebSocket连接
- 限流机制：防止API滥用

### 错误处理
- 重试机制：API调用失败自动重试
- 降级服务：主服务失败时使用备用服务
- 熔断器：防止服务雪崩

## 部署

### Docker部署
```dockerfile
# 详见 Dockerfile
docker build -t vr-translation-service .
docker run -p 8080:8080 vr-translation-service
```

### 生产环境配置
- 使用 PM2 进程管理
- 配置 Nginx 反向代理
- 设置监控和告警
- 配置日志轮转

## 监控和运维

### 健康检查
- `/health` - 服务健康状态
- `/metrics` - 性能指标
- `/status` - 详细状态信息

### 日志记录
- 请求/响应日志
- 错误和异常日志
- 性能监控日志
- 业务操作日志
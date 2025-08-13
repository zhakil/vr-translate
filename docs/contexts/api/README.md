# VR Translation Service API 文档

## 概述

VR翻译服务提供了完整的REST API和WebSocket实时通信接口，支持文本翻译、OCR识别、批量处理等功能。

- **版本**: 1.0.0
- **基础URL**: `http://localhost:8080`
- **WebSocket URL**: `ws://localhost:8081`
- **认证方式**: 无需认证（开发模式）
- **速率限制**: 每小时1000次请求

## 快速开始

### REST API 基础调用

```bash
# 翻译文本
curl -X POST http://localhost:8080/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World", "sourceLang": "en", "targetLang": "zh-CN"}'

# 获取API文档
curl http://localhost:8080/api/docs
```

### WebSocket 连接

```javascript
const ws = new WebSocket('ws://localhost:8081');
ws.onopen = () => {
    console.log('WebSocket连接已建立');
};
```

## API 端点

### 1. 文本翻译

#### POST /api/translate

翻译单个文本。

**请求参数**:
```json
{
    "text": "Hello World",           // 必需，要翻译的文本
    "sourceLang": "en",           // 可选，源语言代码，默认'auto'
    "targetLang": "zh-CN"         // 可选，目标语言代码，默认'zh-CN'
}
```

**响应示例**:
```json
{
    "success": true,
    "data": {
        "original": "Hello World",
        "translation": "(Translated from en to zh-CN) Hello World",
        "sourceLang": "en",
        "targetLang": "zh-CN",
        "timestamp": "2025-01-01T00:00:00.000Z"
    }
}
```

### 2. 批量翻译

#### POST /api/translate/batch

批量翻译多个文本（最多100条）。

**请求参数**:
```json
{
    "texts": ["Hello", "World", "Good morning"],  // 必需，文本数组
    "sourceLang": "en",                          // 可选，默认'auto'
    "targetLang": "zh-CN"                        // 可选，默认'zh-CN'
}
```

**响应示例**:
```json
{
    "success": true,
    "data": {
        "results": [
            {
                "index": 0,
                "original": "Hello",
                "translation": "(Translated from en to zh-CN) Hello",
                "success": true
            }
        ],
        "total": 3,
        "successful": 3,
        "failed": 0,
        "sourceLang": "en",
        "targetLang": "zh-CN",
        "timestamp": "2025-01-01T00:00:00.000Z"
    }
}
```

### 3. OCR识别

#### POST /api/ocr

识别图片中的文字。

**请求参数**:
```json
{
    "image": "data:image/png;base64,iVBORw0K...", // 必需，Base64编码的图片
    "lang": "auto"                                // 可选，识别语言，默认'auto'
}
```

**响应示例**:
```json
{
    "success": true,
    "data": {
        "text": "This is a mock OCR result from the server.",
        "language": "auto",
        "timestamp": "2025-01-01T00:00:00.000Z"
    }
}
```

### 4. OCR识别+翻译

#### POST /api/ocr-translate

识别图片文字后进行翻译。

**请求参数**:
```json
{
    "image": "data:image/png;base64,iVBORw0K...", // 必需，Base64编码的图片
    "sourceLang": "auto",                        // 可选，默认'auto'
    "targetLang": "zh-CN"                        // 可选，默认'zh-CN'
}
```

**响应示例**:
```json
{
    "success": true,
    "data": {
        "original": "This is a mock OCR result from the server.",
        "translation": "(Translated from auto to zh-CN) This is a mock OCR result from the server.",
        "sourceLang": "auto",
        "targetLang": "zh-CN",
        "timestamp": "2025-01-01T00:00:00.000Z"
    }
}
```

### 5. 获取支持的语言

#### GET /api/languages

获取所有支持的语言列表。

**响应示例**:
```json
{
    "success": true,
    "data": {
        "common": [
            {
                "code": "zh-CN",
                "name": "中文（简体）",
                "nativeName": "中文"
            },
            {
                "code": "en",
                "name": "英语",
                "nativeName": "English"
            }
        ],
        "all": [
            // 完整语言列表...
        ]
    }
}
```

### 6. 获取服务统计

#### GET /api/stats

获取服务的运行统计信息。

**响应示例**:
```json
{
    "success": true,
    "data": {
        "service": {
            "name": "VR Translation Service",
            "version": "1.0.0",
            "uptime": 3600.123,
            "status": "running"
        },
        "performance": {
            "memoryUsage": {...},
            "cpuUsage": {...},
            "responseTime": "< 100ms"
        },
        "features": {
            "textTranslation": true,
            "ocrRecognition": true,
            "batchTranslation": true,
            "websocketSupport": true,
            "multiLanguage": true
        },
        "limits": {
            "maxTextLength": 10000,
            "maxBatchSize": 100,
            "maxImageSize": "10MB",
            "rateLimit": "1000/hour"
        }
    },
    "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 7. 健康检查

#### GET /health

检查服务健康状态。

**响应示例**:
```json
{
    "status": "ok",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "uptime": 3600.123,
    "environment": "development",
    "version": "1.0.0",
    "services": {
        "websocket": true,
        "ocr": true,
        "translation": true
    }
}
```

## WebSocket 实时通信

### 连接地址
```
ws://localhost:8081
```

### 消息格式

所有WebSocket消息都遵循以下格式：
```json
{
    "type": "message_type",
    "payload": {...},
    "id": 123,
    "timestamp": 1640995200000
}
```

### 支持的消息类型

#### 1. 眼动数据 (gaze)
```json
{
    "type": "gaze",
    "payload": {
        "x": 100,
        "y": 200,
        "timestamp": 1640995200000,
        "confidence": 0.95
    }
}
```

#### 2. 截图请求 (screenshot)
```json
{
    "type": "screenshot",
    "payload": {
        "image": "data:image/png;base64,iVBORw0K...",
        "sourceLang": "en",
        "targetLang": "zh-CN"
    }
}
```

#### 3. 配置更新 (config)
```json
{
    "type": "config",
    "payload": {
        "gaze": {
            "threshold": 2.0,
            "radius": 50
        },
        "translation": {
            "sourceLanguage": "en",
            "targetLanguage": "zh-CN"
        }
    }
}
```

#### 4. 翻译结果 (translation_result)
服务器发送的翻译结果消息：
```json
{
    "type": "translation_result",
    "payload": {
        "original": "Hello World",
        "translation": "你好世界",
        "sourceLang": "en",
        "targetLang": "zh-CN"
    }
}
```

## 错误处理

### HTTP 错误响应格式

所有错误响应都遵循以下格式：
```json
{
    "success": false,
    "error": "ERROR_CODE",
    "message": "错误描述信息"
}
```

### 常见错误代码

| 错误代码 | HTTP状态码 | 描述 |
|---------|-----------|------|
| INVALID_INPUT | 400 | 请求参数无效 |
| MISSING_FIELDS | 400 | 缺少必需字段 |
| INVALID_IMAGE | 400 | 图片数据无效 |
| TOO_MANY_REQUESTS | 400 | 批量请求超出限制 |
| RATE_LIMIT_EXCEEDED | 429 | 请求频率超出限制 |
| TRANSLATION_FAILED | 500 | 翻译服务失败 |
| OCR_FAILED | 500 | OCR服务失败 |
| SERVICE_FAILED | 500 | 服务内部错误 |

## 速率限制

- **限制**: 每个IP每小时1000次请求
- **响应头**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **超出限制**: 返回429状态码

## 语言代码

### 常用语言代码
- `auto`: 自动检测
- `zh-CN`: 中文（简体）
- `zh-TW`: 中文（繁体）
- `en`: 英语
- `ja`: 日语
- `ko`: 韩语
- `fr`: 法语
- `de`: 德语
- `es`: 西班牙语
- `ru`: 俄语

完整的语言支持列表请调用 `/api/languages` 接口获取。

## 性能和限制

### 请求限制
- **文本长度**: 最大10,000字符
- **批量翻译**: 最大100条文本
- **图片大小**: 最大10MB
- **超时时间**: 30秒

### 性能指标
- **响应时间**: < 100ms (文本翻译)
- **OCR识别**: < 1秒
- **批量处理**: < 5秒 (100条文本)
- **并发连接**: 支持1000个并发WebSocket连接

## 示例代码

查看以下文件获取完整的SDK和示例代码：
- JavaScript SDK: `/sdk/javascript/vr-translate-sdk.js`
- Python SDK: `/sdk/python/vr_translate_sdk.py`
- C# SDK: `/sdk/csharp/VRTranslateSDK.cs`
- 集成示例: `/examples/`

## 支持和反馈

如有问题或建议，请联系开发团队或提交Issue。
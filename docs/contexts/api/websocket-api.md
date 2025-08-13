# WebSocket API 文档

## 概述

VR翻译服务使用WebSocket协议进行实时通信，支持眼动追踪数据传输、翻译请求和结果返回。

## 连接信息

- **协议**: WebSocket (ws:// 或 wss://)
- **默认端口**: 8081
- **路径**: `/`
- **示例URL**: `ws://localhost:8081`

## 消息格式

所有消息都使用JSON格式，遵循统一的消息结构：

```typescript
interface BaseMessage {
  id: string;           // 消息唯一ID
  type: MessageType;    // 消息类型
  timestamp: number;    // 时间戳
  clientId?: string;    // 客户端ID
  data: any;           // 消息数据
}
```

## 消息类型

### 连接管理

#### 1. 连接握手 (CONNECT)

**客户端发送**:
```json
{
  "id": "msg_1234567890_abc123",
  "type": "connect",
  "timestamp": 1234567890000,
  "data": {
    "protocolVersion": "1.0.0",
    "clientInfo": {
      "type": "vr_frontend",
      "version": "1.0.0",
      "platform": "android",
      "capabilities": ["eye_tracking", "translation"]
    }
  }
}
```

**服务器响应**:
```json
{
  "id": "msg_1234567890_def456",
  "type": "connect",
  "timestamp": 1234567890001,
  "data": {
    "success": true,
    "clientId": "client_abc123def456",
    "serverInfo": {
      "version": "1.0.0",
      "capabilities": ["ocr", "translation", "caching"]
    },
    "protocolConfig": {
      "heartbeatInterval": 30000,
      "messageTimeout": 10000
    }
  }
}
```

#### 2. 心跳 (HEARTBEAT)

**双向发送**:
```json
{
  "id": "msg_1234567890_hb001",
  "type": "heartbeat",
  "timestamp": 1234567890000,
  "data": {
    "clientTimestamp": 1234567890000
  }
}
```

#### 3. 断开连接 (DISCONNECT)

```json
{
  "id": "msg_1234567890_dc001",
  "type": "disconnect",
  "timestamp": 1234567890000,
  "data": {
    "reason": "client_request",
    "message": "User requested disconnect",
    "canReconnect": true
  }
}
```

### 眼动追踪

#### 4. 眼动数据 (GAZE_DATA)

**客户端发送**:
```json
{
  "id": "msg_1234567890_gaze01",
  "type": "gaze_data",
  "timestamp": 1234567890000,
  "data": {
    "timestamp": 1234567890000,
    "gazeOrigin": [0.0, 1.6, -0.5],
    "gazeDirection": [0.0, 0.0, 1.0],
    "confidence": 0.95,
    "isValid": true,
    "hasHit": true,
    "hitPoint": [0.0, 1.6, 2.5],
    "hitDistance": 3.0,
    "hitObjectId": "text_object_001"
  }
}
```

#### 5. 注视开始 (GAZE_START)

**客户端发送**:
```json
{
  "id": "msg_1234567890_gs001",
  "type": "gaze_start",
  "timestamp": 1234567890000,
  "data": {
    "startTime": 1234567890000,
    "gazePosition": [0.0, 1.6, 2.5],
    "gazeDirection": [0.0, 0.0, 1.0],
    "gazeObjectId": "text_object_001",
    "textBounds": {
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 50
    },
    "isTriggered": false
  }
}
```

#### 6. 注视触发 (GAZE_TRIGGER)

**客户端发送**:
```json
{
  "id": "msg_1234567890_gt001",
  "type": "gaze_trigger",
  "timestamp": 1234567890000,
  "data": {
    "startTime": 1234567888500,
    "endTime": 1234567890000,
    "duration": 1500,
    "gazePosition": [0.0, 1.6, 2.5],
    "gazeDirection": [0.0, 0.0, 1.0],
    "gazeObjectId": "text_object_001",
    "textBounds": {
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 50
    },
    "isTriggered": true
  }
}
```

### 翻译功能

#### 7. 翻译请求 (TRANSLATION_REQUEST)

**客户端发送**:
```json
{
  "id": "msg_1234567890_tr001",
  "type": "translation_request",
  "timestamp": 1234567890000,
  "data": {
    "screenRegion": {
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 50
    },
    "translationRequest": {
      "text": "Hello World",
      "sourceLanguage": "en",
      "targetLanguage": "zh-CN"
    },
    "gazeInfo": {
      "gazeObjectId": "text_object_001",
      "duration": 1500
    }
  }
}
```

#### 8. 翻译结果 (TRANSLATION_RESULT)

**服务器发送**:
```json
{
  "id": "msg_1234567890_tres01",
  "type": "translation_result",
  "timestamp": 1234567890000,
  "data": {
    "translationResult": {
      "originalText": "Hello World",
      "translatedText": "你好世界",
      "confidence": 0.98,
      "sourceLanguage": "en",
      "targetLanguage": "zh-CN",
      "provider": "google_translate",
      "processingTime": 850
    },
    "ocrResult": {
      "text": "Hello World",
      "confidence": 0.95,
      "boundingBox": {
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 50
      },
      "language": "en",
      "processingTime": 650
    },
    "requestId": "msg_1234567890_tr001"
  }
}
```

### 配置管理

#### 9. 配置更新 (CONFIG_UPDATE)

**双向发送**:
```json
{
  "id": "msg_1234567890_cfg01",
  "type": "config_update",
  "timestamp": 1234567890000,
  "data": {
    "eyeTracking": {
      "updateRate": 60,
      "confidenceThreshold": 0.7,
      "gazeRayLength": 100.0
    },
    "gazeDetection": {
      "gazeThreshold": 1.5,
      "gazeRadius": 0.5,
      "showGazeIndicator": true
    },
    "translation": {
      "sourceLanguage": "auto",
      "targetLanguage": "zh-CN",
      "provider": "google_translate"
    }
  }
}
```

### 错误处理

#### 10. 错误消息 (ERROR)

**服务器发送**:
```json
{
  "id": "msg_1234567890_err01",
  "type": "error",
  "timestamp": 1234567890000,
  "data": {
    "code": "TRANSLATION_FAILED",
    "message": "Translation service temporarily unavailable",
    "details": {
      "provider": "google_translate",
      "httpStatus": 503,
      "retryAfter": 5000
    },
    "requestId": "msg_1234567890_tr001"
  }
}
```

### 状态信息

#### 11. 状态消息 (STATUS)

**服务器发送**:
```json
{
  "id": "msg_1234567890_st001",
  "type": "status",
  "timestamp": 1234567890000,
  "data": {
    "services": {
      "eyeTracking": true,
      "ocr": true,
      "translation": true,
      "websocket": true
    },
    "connections": {
      "total": 5,
      "active": 3
    },
    "performance": {
      "memoryUsage": 512000000,
      "cpuUsage": 0.15,
      "uptime": 3600000
    }
  }
}
```

## 错误代码

| 错误代码 | 描述 | 处理建议 |
|---------|------|---------|
| `UNKNOWN_ERROR` | 未知错误 | 重试请求或联系支持 |
| `INVALID_REQUEST` | 无效请求 | 检查请求格式和参数 |
| `INVALID_MESSAGE_FORMAT` | 消息格式错误 | 验证JSON格式和必需字段 |
| `CONNECTION_FAILED` | 连接失败 | 检查网络连接和服务器状态 |
| `CONNECTION_TIMEOUT` | 连接超时 | 增加超时时间或检查网络 |
| `EYE_TRACKING_NOT_SUPPORTED` | 不支持眼动追踪 | 使用支持眼动追踪的设备 |
| `OCR_SERVICE_UNAVAILABLE` | OCR服务不可用 | 等待服务恢复或使用备用服务 |
| `OCR_PROCESSING_FAILED` | OCR处理失败 | 检查图像质量和格式 |
| `TRANSLATION_FAILED` | 翻译失败 | 重试或更换翻译服务 |
| `UNSUPPORTED_LANGUAGE` | 不支持的语言 | 使用支持的语言代码 |

## 连接流程

### 1. 建立连接
1. 客户端连接到WebSocket服务器
2. 发送连接握手消息
3. 服务器验证并响应连接信息
4. 开始心跳机制

### 2. 眼动追踪流程
1. 客户端持续发送眼动数据
2. 服务器分析注视行为
3. 检测到注视开始时发送GAZE_START
4. 达到触发条件时发送GAZE_TRIGGER

### 3. 翻译流程
1. 注视触发后发送翻译请求
2. 服务器进行OCR识别
3. 调用翻译服务
4. 返回翻译结果给客户端

### 4. 错误处理
1. 服务器检测到错误时发送ERROR消息
2. 客户端根据错误代码进行相应处理
3. 必要时进行重试或降级处理

## 最佳实践

### 性能优化
- 限制眼动数据发送频率（建议30-60Hz）
- 使用连接池管理WebSocket连接
- 实现消息队列避免阻塞
- 启用消息压缩减少带宽

### 错误处理
- 实现指数退避重试机制
- 设置合理的超时时间
- 提供降级服务方案
- 记录详细的错误日志

### 安全考虑
- 使用WSS加密连接（生产环境）
- 实现客户端认证机制
- 验证消息格式和内容
- 限制连接数和消息频率

## 示例代码

### JavaScript客户端示例

```javascript
const ws = new WebSocket('ws://localhost:8081');

// 连接建立
ws.onopen = function() {
  const handshake = {
    id: generateMessageId(),
    type: 'connect',
    timestamp: Date.now(),
    data: {
      protocolVersion: '1.0.0',
      clientInfo: {
        type: 'vr_frontend',
        version: '1.0.0',
        platform: 'android'
      }
    }
  };
  ws.send(JSON.stringify(handshake));
};

// 接收消息
ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  switch(message.type) {
    case 'translation_result':
      handleTranslationResult(message.data);
      break;
    case 'error':
      handleError(message.data);
      break;
  }
};

// 发送眼动数据
function sendGazeData(gazeData) {
  const message = {
    id: generateMessageId(),
    type: 'gaze_data',
    timestamp: Date.now(),
    data: gazeData
  };
  ws.send(JSON.stringify(message));
}
```
# 系统架构设计

## 1. 整体架构概述

### 1.1 架构模式
采用**微服务架构**，将系统分为以下几个独立的服务组件：

```
┌─────────────────┐    WebSocket    ┌──────────────────┐
│   VR Frontend   │ ◄──────────────► │ Translation      │
│   (Unity)       │                 │ Service Backend  │
└─────────────────┘                 └──────────────────┘
        │                                    │
        │ Eye Tracking                       │ API Calls
        │ Data                               │
        ▼                                    ▼
┌─────────────────┐                 ┌──────────────────┐
│ Eye Tracking    │                 │   External APIs  │
│ SDK             │                 │ ┌──────────────┐ │
└─────────────────┘                 │ │ OCR Service  │ │
                                    │ │ (Google/...)  │ │
                                    │ └──────────────┘ │
                                    │ ┌──────────────┐ │
                                    │ │ Translation  │ │
                                    │ │ Service      │ │
                                    │ │ (Google/...) │ │
                                    │ └──────────────┘ │
                                    └──────────────────┘
```

### 1.2 核心设计原则

1. **解耦性**: 前端VR应用与翻译服务完全分离
2. **高性能**: 翻译处理不影响VR主应用帧率
3. **可扩展性**: 支持多种VR设备和翻译服务
4. **容错性**: 服务失败不影响VR主体验

## 2. 详细架构设计

### 2.1 VR Frontend (前端)

#### 技术栈
- **引擎**: Unity 2022.3 LTS
- **语言**: C#
- **VR SDK**: 
  - Pico SDK (Pico设备)
  - Meta Quest SDK (Quest设备)
  - OpenXR (通用VR)

#### 核心模块

```
VR Frontend
├── EyeTrackingManager     # 眼动追踪管理
├── GazeDetector           # 注视检测器
├── UIManager              # 界面管理
├── TranslationDisplay     # 翻译结果显示
├── NetworkManager         # 网络通信
└── ConfigManager          # 配置管理
```

#### 职责
- 实时获取眼动追踪数据
- 检测用户注视行为
- 与后端服务通信
- 显示翻译结果UI
- 处理用户配置

### 2.2 Translation Service Backend (后端)

#### 技术栈选择

**方案A: Node.js + TypeScript**
```
优势: 
- 与前端统一语言生态
- 优秀的WebSocket支持
- 丰富的OCR/翻译库
- 快速开发部署

劣势:
- 图像处理性能一般
```

**方案B: Python**
```
优势:
- 强大的AI/ML库支持
- 优秀的图像处理能力
- 丰富的OCR库选择

劣势:
- 异步处理相对复杂
```

**推荐**: Node.js + TypeScript （考虑到WebSocket实时通信需求）

#### 核心模块

```
Backend Service
├── WebSocketServer        # WebSocket服务器
├── GazeAnalyzer          # 注视分析器
├── ScreenCapture         # 屏幕截图
├── OCRService            # OCR文字识别
├── TranslationService    # 翻译服务
├── ConfigService         # 配置服务
└── LoggingService        # 日志服务
```

#### 职责
- 接收眼动追踪数据
- 分析注视行为模式
- 执行屏幕截图
- 调用OCR服务识别文字
- 调用翻译服务翻译文本
- 返回翻译结果给前端

### 2.3 通信协议设计

#### WebSocket消息格式

```typescript
// 基础消息结构
interface BaseMessage {
  id: string;
  type: MessageType;
  timestamp: number;
}

// 消息类型
enum MessageType {
  GAZE_DATA = 'gaze_data',
  TRANSLATION_REQUEST = 'translation_request',
  TRANSLATION_RESULT = 'translation_result',
  CONFIG_UPDATE = 'config_update',
  ERROR = 'error'
}

// 注视数据消息
interface GazeDataMessage extends BaseMessage {
  type: MessageType.GAZE_DATA;
  data: {
    position: Vector3;
    direction: Vector3;
    confidence: number;
    timestamp: number;
  }
}

// 翻译请求消息
interface TranslationRequestMessage extends BaseMessage {
  type: MessageType.TRANSLATION_REQUEST;
  data: {
    screenRegion: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    sourceLanguage?: string;
    targetLanguage: string;
  }
}

// 翻译结果消息
interface TranslationResultMessage extends BaseMessage {
  type: MessageType.TRANSLATION_RESULT;
  data: {
    originalText: string;
    translatedText: string;
    confidence: number;
    sourceLanguage: string;
    targetLanguage: string;
  }
}
```

## 3. 数据流设计

### 3.1 主要数据流

```
1. 眼动数据流
VR Head → Eye Tracking SDK → VR Frontend → WebSocket → Backend

2. 翻译请求流
VR Frontend → WebSocket → Backend → OCR API → Translation API → Backend

3. 翻译结果流
Backend → WebSocket → VR Frontend → UI Display

4. 配置数据流
VR Frontend ↔ WebSocket ↔ Backend ↔ Config Storage
```

### 3.2 实时处理流程

```
[用户注视] 
    ↓
[眼动追踪数据获取] (60-120 FPS)
    ↓
[注视区域检测] (实时)
    ↓
[注视持续时间计算] (实时)
    ↓
[达到阈值] (可配置，默认1-2秒)
    ↓
[触发翻译请求] (异步)
    ↓
[屏幕区域截图] (异步)
    ↓
[OCR文字识别] (异步，1-3秒)
    ↓
[文本翻译] (异步，0.5-2秒)
    ↓
[结果返回显示] (实时)
```

## 4. 性能优化策略

### 4.1 前端优化
- **眼动数据采样**: 智能降频，减少不必要的数据传输
- **UI渲染优化**: 使用对象池管理翻译UI组件
- **网络缓存**: 缓存常用翻译结果

### 4.2 后端优化
- **并发处理**: 使用异步队列处理翻译请求
- **结果缓存**: Redis缓存OCR和翻译结果
- **API限流**: 智能管理第三方API调用频率

### 4.3 通信优化
- **WebSocket连接池**: 管理和复用WebSocket连接
- **消息压缩**: 使用gzip压缩大型消息
- **心跳检测**: 保持连接稳定性

## 5. 错误处理与容错

### 5.1 服务降级策略
1. OCR服务失败 → 使用备用OCR服务
2. 翻译服务失败 → 使用离线翻译模型
3. 网络连接失败 → 本地缓存模式
4. 后端服务失败 → 前端提示，不影响主VR体验

### 5.2 重试机制
- 指数退避重试策略
- 最大重试次数限制
- 服务健康检查

## 6. 安全性考虑

### 6.1 数据安全
- WebSocket连接使用WSS (SSL/TLS)
- 敏感配置加密存储
- 用户数据本地化处理

### 6.2 API安全
- API密钥安全管理
- 请求频率限制
- 输入数据验证

## 7. 可扩展性设计

### 7.1 多VR设备支持
- 抽象眼动追踪接口
- 插件化VR SDK集成
- 统一的设备配置管理

### 7.2 多语言支持
- 可配置的语言对
- 支持自定义翻译服务
- 本地化UI界面

### 7.3 多翻译服务支持
- 翻译服务抽象接口
- 服务提供商插件化
- 智能服务选择算法
# Shared Module - 共享模块

## 概述

此模块包含前端VR应用和后端翻译服务之间共享的类型定义、通信协议、常量和工具函数。

## 模块结构

```
shared/
├── types/              # 类型定义
│   └── index.ts       # 所有共享类型定义
├── protocols/          # 通信协议
│   └── websocket-protocol.ts  # WebSocket通信协议
├── constants/          # 常量定义
│   └── index.ts       # 所有共享常量
├── utils/              # 工具函数
│   └── index.ts       # 通用工具函数
└── README.md          # 说明文档
```

## 模块内容

### 1. 类型定义 (types/)

#### 基础数据类型
- `Vector3` - 3D向量
- `Point2D` - 2D坐标点
- `Rectangle` - 矩形区域
- `BoundingBox` - 边界框

#### 眼动追踪相关类型
- `EyeTrackingData` - 眼动追踪数据
- `GazeInfo` - 注视信息
- `EyeTrackingSettings` - 眼动追踪设置
- `GazeDetectionSettings` - 注视检测设置

#### OCR相关类型
- `OCRResult` - OCR识别结果
- `OCRRequest` - OCR请求参数
- `OCRTextLine` - OCR文本行
- `OCRWord` - OCR单词

#### 翻译相关类型
- `TranslationResult` - 翻译结果
- `TranslationRequest` - 翻译请求参数
- `LanguageInfo` - 语言信息

#### WebSocket消息类型
- `MessageType` - 消息类型枚举
- `BaseMessage` - 基础消息结构
- 各种具体消息类型 (GazeDataMessage, TranslationRequestMessage等)

#### 配置类型
- `AppConfig` - 应用配置
- `NetworkConfig` - 网络配置
- `TranslationConfig` - 翻译配置
- `UIConfig` - UI配置

#### 错误类型
- `ErrorCode` - 错误代码枚举
- `AppError` - 应用错误接口

### 2. 通信协议 (protocols/)

#### WebSocket协议
- 协议版本管理
- 消息格式规范
- 连接管理机制
- 错误处理规范
- 消息路由和处理
- 消息确认机制

#### 核心特性
- **消息封装**: 扩展消息结构支持优先级、确认、过期时间
- **连接管理**: 握手、心跳、重连机制
- **错误处理**: 统一错误格式和处理流程
- **消息验证**: 格式验证和安全检查

### 3. 常量定义 (constants/)

#### 应用常量
- 应用名称、版本、协议版本
- 网络配置默认值
- 超时和重试设置

#### 眼动追踪常量
- 更新频率范围
- 置信度阈值
- 注视检测参数

#### OCR和翻译常量
- 超时设置
- 图像大小限制
- 支持的格式和提供商
- 语言代码和名称

#### UI常量
- 位置选项
- 尺寸限制
- 动画参数
- 颜色定义

#### 性能常量
- 目标帧率
- 内存和CPU阈值
- 缓存配置

#### VR设备常量
- 支持的设备类型
- SDK类型
- 眼动追踪支持情况

### 4. 工具函数 (utils/)

#### 数学工具
- 3D/2D距离计算
- 向量运算 (归一化、点积、叉积)
- 线性插值
- 角度转换
- 数值限制

#### 几何工具
- 点在矩形内检测
- 矩形重叠检测
- 矩形操作 (中心点、面积、扩展)

#### 字符串工具
- UUID和短ID生成
- 文本清理和格式化
- 命名规则转换
- 语言代码验证

#### 时间工具
- 时间戳处理
- 时间格式化
- 持续时间计算
- 睡眠函数

#### 数据验证工具
- 空值检查
- 深度相等比较
- URL和颜色格式验证

#### 数组工具
- 去重、分组、随机排序
- 随机元素选择
- 数组分块

#### 对象工具
- 深拷贝和深度合并
- 嵌套属性操作

#### 性能工具
- 防抖和节流函数
- 性能测量

## 使用方式

### TypeScript/Node.js 项目

```typescript
// 导入类型
import { 
  EyeTrackingData, 
  TranslationResult, 
  MessageType 
} from '../shared/types';

// 导入协议
import { 
  WebSocketProtocolConfig,
  createExtendedMessage,
  validateMessage 
} from '../shared/protocols/websocket-protocol';

// 导入常量
import { 
  DEFAULT_GAZE_THRESHOLD,
  SUPPORTED_LANGUAGES,
  VR_DEVICES 
} from '../shared/constants';

// 导入工具函数
import { 
  distance3D,
  generateUUID,
  debounce,
  deepClone 
} from '../shared/utils';
```

### C# Unity 项目

需要将TypeScript类型转换为C#等价类型：

```csharp
// 在Unity中创建对应的C#结构
[System.Serializable]
public struct Vector3Data
{
    public float x;
    public float y;
    public float z;
}

[System.Serializable]
public struct EyeTrackingData
{
    public float timestamp;
    public Vector3Data gazeOrigin;
    public Vector3Data gazeDirection;
    public float confidence;
    public bool isValid;
    // ... 其他字段
}
```

## 版本管理

- 使用语义版本控制 (Semantic Versioning)
- 协议版本与模块版本保持同步
- 重大更改时增加主版本号
- 新增功能时增加次版本号
- 问题修复时增加修订版本号

## 最佳实践

### 类型安全
- 使用TypeScript严格类型检查
- 为所有公共接口定义类型
- 使用联合类型和枚举提高类型安全

### 向后兼容
- 新增字段时使用可选属性
- 保持现有字段的类型和含义不变
- 使用版本号进行兼容性检查

### 性能优化
- 避免深度嵌套的对象结构
- 使用合适的数据类型
- 考虑序列化和反序列化性能

### 错误处理
- 定义清晰的错误代码和消息
- 提供足够的错误上下文信息
- 实现优雅的错误恢复机制

## 贡献指南

1. 新增类型时，确保在相应的注释中说明用途
2. 常量应该有明确的命名和合理的默认值
3. 工具函数应该是纯函数，避免副作用
4. 协议变更需要更新版本号并编写迁移指南
5. 所有公共API都应该有完整的文档注释
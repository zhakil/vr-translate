# Protocols Context
## 模块职责
定义前后端通信的WebSocket消息协议格式，确保双方能够正确地序列化、反序列化和理解消息内容。
## 开发Context
### 核心功能
1. **基础消息结构 (`BaseMessage`)**
   - 定义所有消息共有的字段，如`type` (消息类型), `timestamp`, `payload`。
2. **具体消息类型定义**
   - 为每种消息类型（如`GazeDataMessage`, `TranslationResultMessage`）定义其`payload`的具体结构。
   - 使用TypeScript的接口或类型进行严格定义。

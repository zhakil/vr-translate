# Constants Context
## 模块职责
定义在前端和后端之间共享的常量，确保双方使用一致的约定，减少魔法字符串和硬编码值。
## 开发Context
### 核心常量
1. **事件名称 (`EventNames`)**
   - WebSocket消息的事件名，如`GazeData`, `TranslationRequest`, `TranslationResponse`。
2. **错误代码 (`ErrorCodes`)**
   - 定义通用的错误码及其描述。
3. **默认值 (`Defaults`)**
   - 如默认的注视时长阈值、默认语言等。

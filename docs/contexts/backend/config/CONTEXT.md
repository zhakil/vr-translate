# Backend Config Context
## 模块职责
管理后端服务的所有配置，包括服务器设置、数据库连接、API密钥、日志级别和第三方服务集成参数。
## 开发Context
### 核心功能
1. **`default.json`**
   - 提供所有配置项的默认值。
   - 定义配置结构，如`server`, `websocket`, `ocr`, `translation`。
2. **环境特定配置**
   - 通过`NODE_ENV`（如`development`, `production`）加载不同配置（`development.json`, `production.json`）。
   - 敏感数据（如API密钥）通过环境变量注入。

# Frontend Config Context
## 模块职责
管理前端应用的所有配置文件，包括项目设置、VR平台配置、API密钥和用户可调参数。
## 开发Context
### 核心配置
1. **`project-config.json`**:
   - 项目名称、版本、描述
   - Unity版本、目标平台
2. **`vr-settings.json`**:
   - 不同VR SDK的特定配置
   - 交互设置（如控制器映射）
3. **`api-keys.json` (.gitignore)**:
   - 后端服务地址
   - 其他需要授权的第三方服务密钥

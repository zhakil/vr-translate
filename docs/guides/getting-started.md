# VR眼球注视自动翻译系统 - 快速开始指南

## 项目概述

本项目是一个创新的VR应用，通过眼球追踪技术实现自动翻译功能。当用户在VR环境中注视文字超过预设时间后，系统会自动识别文字内容并进行翻译显示。

## 系统要求

### 硬件要求
- **VR头显**: 支持眼动追踪的VR设备
  - Pico 4 (推荐)
  - Meta Quest Pro
  - HTC Vive Pro Eye
  - Varjo Aero
- **开发机**: Windows 10/11, 8GB+ RAM, 支持VR的显卡

### 软件要求
- **前端开发**:
  - Unity 2022.3 LTS
  - Visual Studio 2022 或 VS Code
  - 相应VR设备的SDK
- **后端开发**:
  - Node.js 18+
  - TypeScript 5.0+
  - VS Code (推荐)

## 项目结构

```
vr-translate/
├── frontend/           # VR应用前端 (Unity + C#)
├── backend/            # 翻译服务后端 (Node.js + TypeScript)
├── shared/             # 共享类型定义和协议
└── docs/               # 项目文档
```

## 环境配置

### 1. 克隆项目

```bash
git clone [项目地址]
cd vr-translate
```

### 2. 后端环境配置

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 复制环境配置文件
cp .env.example .env

# 配置API密钥 (编辑 .env 文件)
# GOOGLE_VISION_API_KEY=your_google_vision_api_key
# GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key
```

### 3. 前端环境配置

#### Unity项目配置
1. 使用Unity Hub打开 `frontend/unity` 项目
2. 确保Unity版本为 2022.3 LTS
3. 在Package Manager中安装必要的包：
   - XR Interaction Toolkit
   - OpenXR Plugin
   - 对应VR设备的SDK

#### VR设备SDK配置

**Pico 4 设备**:
1. 下载Pico Unity Integration SDK
2. 导入SDK包到Unity项目
3. 配置Project Settings > XR Plug-in Management

**Meta Quest 设备**:
1. 下载Meta Quest SDK
2. 导入Oculus Integration包
3. 配置Android Build Settings

### 4. API服务配置

#### Google Cloud API配置
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用以下API:
   - Cloud Vision API (OCR文字识别)
   - Cloud Translation API (文本翻译)
4. 创建服务账号密钥
5. 下载JSON密钥文件并配置环境变量

#### DeepL API配置 (可选)
1. 注册 [DeepL API](https://www.deepl.com/pro-api)
2. 获取API密钥
3. 在后端配置文件中添加DeepL配置

## 开发环境运行

### 1. 启动后端服务

```bash
cd backend

# 开发模式运行
npm run dev

# 或者构建后运行
npm run build
npm start
```

后端服务将在以下端口启动：
- HTTP API: http://localhost:8080
- WebSocket: ws://localhost:8081

### 2. 配置前端连接

在Unity项目中，配置NetworkManager组件：
- Server Host: `localhost`
- Server Port: `8081`
- Use SSL: `false` (开发环境)

### 3. 运行VR应用

1. 连接VR头显到开发机
2. 确保VR设备驱动正常工作
3. 在Unity中点击Play按钮进行测试
4. 或者构建APK安装到VR设备

## 基本使用流程

### 1. 眼动追踪校准
- 启动应用后，按照提示进行眼动追踪校准
- 确保校准质量达到推荐标准

### 2. 翻译功能使用
1. 在VR环境中找到包含文字的对象
2. 将视线聚焦在文字区域
3. 保持注视1.5秒（默认设置）
4. 系统自动识别文字并显示翻译结果
5. 翻译结果会在不干扰主界面的位置显示

### 3. 设置调整
- 通过VR手柄打开设置菜单
- 调整注视触发时间
- 更改源语言和目标语言
- 调整翻译显示位置和样式

## 开发调试

### 后端调试

```bash
# 查看日志
tail -f logs/app.log

# 测试API端点
curl http://localhost:8080/health
curl http://localhost:8080/status

# 运行测试
npm test
```

### 前端调试

1. **Unity控制台**: 查看实时日志和错误信息
2. **VR设备日志**: 
   ```bash
   # Android设备 (Quest/Pico)
   adb logcat | grep Unity
   ```
3. **网络调试**: 在NetworkManager中启用详细日志

### 常见问题排查

#### 眼动追踪问题
- 检查VR设备是否支持眼动追踪
- 确认眼动追踪权限已授予
- 重新进行眼动追踪校准

#### 网络连接问题
- 确认后端服务正在运行
- 检查防火墙设置
- 验证IP地址和端口配置

#### OCR/翻译问题
- 检查API密钥是否正确配置
- 确认网络连接正常
- 查看后端日志了解具体错误

## 部署指南

### 后端部署

#### Docker部署 (推荐)
```bash
cd backend

# 构建Docker镜像
docker build -t vr-translation-service .

# 运行容器
docker run -p 8080:8080 -p 8081:8081 \
  -e GOOGLE_VISION_API_KEY=your_key \
  -e GOOGLE_TRANSLATE_API_KEY=your_key \
  vr-translation-service
```

#### PM2部署
```bash
cd backend

# 安装PM2
npm install -g pm2

# 构建项目
npm run build

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status
pm2 logs
```

### 前端部署

#### Android构建 (Quest/Pico)
1. 在Unity中切换到Android平台
2. 配置Player Settings:
   - Package Name: com.yourcompany.vrtranslate
   - Minimum API Level: 29
   - Target API Level: 30+
3. 构建APK或AAB文件
4. 通过adb安装或上传到应用商店

#### PC VR构建
1. 切换到Windows平台
2. 配置OpenXR或SteamVR
3. 构建可执行文件
4. 分发安装包

## 性能优化

### 前端优化
- 使用对象池管理UI组件
- 优化眼动追踪数据传输频率
- 实现LOD系统减少渲染负载
- 使用异步加载避免帧率下降

### 后端优化
- 启用Redis缓存常用翻译结果
- 使用连接池管理数据库连接
- 实现API请求限流
- 配置负载均衡

## 监控和日志

### 日志配置
```json
{
  "logging": {
    "level": "info",
    "file": {
      "enabled": true,
      "filename": "./logs/app.log",
      "maxSize": "20m",
      "maxFiles": 5
    }
  }
}
```

### 监控指标
- WebSocket连接数
- API响应时间
- 翻译成功率
- 内存和CPU使用率
- 错误率和异常统计

## 下一步

1. **阅读详细文档**: 查看 `docs/` 目录下的技术文档
2. **查看示例代码**: 了解核心功能的实现
3. **参与贡献**: 提交bug报告或功能建议
4. **社区交流**: 加入开发者社区讨论

## 支持和反馈

- **技术文档**: [docs/](../README.md)
- **问题报告**: [GitHub Issues]
- **功能建议**: [GitHub Discussions]
- **开发者社区**: [Discord/Slack]

---

**注意**: 本项目仍在开发中，API可能会发生变化。建议关注项目更新和版本发布说明。
# VR Frontend - 眼球注视翻译应用

## 概述

基于Unity开发的VR应用前端，负责处理VR渲染、眼动追踪、用户交互和翻译结果显示。

## 技术栈

- **引擎**: Unity 2022.3 LTS
- **语言**: C#
- **VR SDK**: 
  - Pico SDK 4.0+
  - Meta Quest SDK
  - OpenXR (通用VR支持)
- **网络**: WebSocket (websocket-sharp)

## 项目结构

```
frontend/
├── unity/                 # Unity项目文件
│   ├── Assets/
│   │   ├── Scripts/       # C#脚本
│   │   ├── Prefabs/       # 预制体
│   │   ├── Materials/     # 材质
│   │   ├── Scenes/        # 场景文件
│   │   └── Plugins/       # 第三方插件
│   ├── Packages/          # Package Manager包
│   ├── ProjectSettings/   # 项目设置
│   └── UserSettings/      # 用户设置
├── src/                   # 源代码文档
├── assets/                # 外部资源
├── config/                # 配置文件
└── docs/                  # 文档
```

## 核心模块

### 1. EyeTrackingManager (眼动追踪管理器)
- 初始化VR设备眼动追踪
- 实时获取注视数据
- 数据滤波和平滑处理

### 2. GazeDetector (注视检测器)
- 注视区域定义和检测
- 注视持续时间计算
- 注视事件触发

### 3. NetworkManager (网络管理器)
- WebSocket连接管理
- 消息序列化/反序列化
- 连接状态监控

### 4. TranslationDisplay (翻译显示器)
- 翻译结果UI渲染
- 动画和过渡效果
- 多语言文本显示

### 5. ConfigManager (配置管理器)
- 用户设置管理
- 语言配置
- 触发参数设置

## 开发环境设置

### Unity版本要求
- Unity 2022.3 LTS
- Universal Render Pipeline (URP)
- XR Interaction Toolkit

### 依赖包
```json
{
  "com.unity.xr.interaction.toolkit": "2.5.0",
  "com.unity.xr.openxr": "1.8.0",
  "com.unity.render-pipelines.universal": "14.0.0",
  "com.unity.textmeshpro": "3.0.6"
}
```

## 配置说明

### VR设备配置
- 支持多种VR头显设备
- 自动检测眼动追踪支持
- 设备特定的校准流程

### 网络配置
- WebSocket服务器地址配置
- 连接重试机制
- 超时设置

### 翻译配置
- 源语言和目标语言设置
- 注视触发时间阈值
- UI显示位置和样式

## 性能优化

### 渲染优化
- UI对象池管理
- 异步UI更新
- LOD (Level of Detail) 管理

### 网络优化
- 数据传输频率控制
- 消息队列管理
- 带宽使用优化

## 构建和部署

### Android (Quest/Pico)
```bash
# 构建设置
Platform: Android
Architecture: ARM64
API Level: 29+
Scripting Backend: IL2CPP
```

### PC VR (SteamVR/OpenXR)
```bash
# 构建设置
Platform: Windows
Architecture: x64
Scripting Backend: Mono/IL2CPP
```
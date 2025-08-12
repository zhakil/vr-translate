# Unity VR Project Context

## 模块职责
Unity VR项目的核心，负责VR应用的整体框架、场景管理、渲染流水线和VR交互系统。

## 开发Context

### 项目设置
- **Unity版本**: 2022.3 LTS
- **渲染管线**: Universal Render Pipeline (URP)
- **XR框架**: XR Interaction Toolkit 2.5+
- **平台支持**: Android (Quest/Pico), Windows (PC VR)

### 核心场景结构
```
Scenes/
├── MainScene.unity          # 主场景
├── CalibrationScene.unity   # 眼动追踪校准场景
└── SettingsScene.unity      # 设置界面场景
```

### 主要GameObject层次
```
VRTranslateApp
├── XR Origin (XR Rig)
│   ├── Camera Offset
│   │   ├── Main Camera (眼动追踪组件)
│   │   ├── LeftHand Controller
│   │   └── RightHand Controller
├── EyeTrackingManager
├── GazeDetector
├── NetworkManager
├── TranslationDisplay
├── UICanvas (World Space)
└── Settings
```

### 必需的Unity包
```json
{
  "com.unity.xr.interaction.toolkit": "2.5.0",
  "com.unity.xr.openxr": "1.8.0", 
  "com.unity.render-pipelines.universal": "14.0.0",
  "com.unity.textmeshpro": "3.0.6",
  "com.unity.inputsystem": "1.6.0"
}
```

### VR设备特定配置

#### Pico设备
- **SDK**: Pico Unity Integration SDK 4.0+
- **Permission**: `android.permission.EYE_TRACKING`
- **Manifest配置**: Eye tracking support声明

#### Quest设备  
- **SDK**: Meta Quest SDK / Oculus Integration
- **Permission**: Eye tracking权限请求
- **Platform**: Oculus Android平台

#### OpenXR通用
- **Extension**: Eye Gaze Interaction Extension
- **Feature**: Eye tracking feature启用

### 关键脚本组件

#### XR Camera配置
```csharp
// 眼动追踪组件挂载
- EyeTrackingManager
- GazeDetector  
- Camera参数优化 (FOV, 近远裁剪面)
```

#### 输入系统设置
```csharp
// Input Actions配置
- Eye Gaze Position
- Eye Gaze Rotation  
- Controller Inputs
- Hand Tracking (可选)
```

### 渲染优化设置
- **目标帧率**: 90 FPS (Quest 3), 72 FPS (Quest 2)
- **MSAA**: 4x (性能允许的情况下)
- **Dynamic Resolution**: 启用
- **Occlusion Culling**: 启用
- **GPU Skinning**: 启用

### Asset组织结构
```
Assets/
├── _VRTranslate/
│   ├── Scripts/           # 所有C#脚本
│   ├── Prefabs/          # 预制体
│   ├── Materials/        # 材质
│   ├── Textures/         # 贴图
│   ├── UI/               # UI资源
│   └── Settings/         # ScriptableObject配置
├── Plugins/              # 第三方插件
│   ├── PicoSDK/         # Pico SDK (如果使用)
│   └── OculusSDK/       # Oculus SDK (如果使用)
└── StreamingAssets/      # 运行时资源
```

### Build设置优化

#### Android构建
```csharp
// Player Settings
- Package Name: com.yourcompany.vrtranslate
- Minimum API Level: 29 (Android 10)
- Target API Level: 30+
- Scripting Backend: IL2CPP
- Target Architectures: ARM64
- Internet Access: Require
```

#### 性能配置
```csharp
// Quality Settings
- Texture Quality: Full/Half (根据设备调整)
- Anisotropic Textures: Per Texture
- Anti Aliasing: 4x Multi Sampling
- Soft Particles: 启用
- Realtime Reflection Probes: 禁用
```

### 内存管理
- **Texture Streaming**: 启用，减少内存占用
- **Mesh Compression**: 启用
- **Audio Compression**: 根据内容选择格式
- **Object Pooling**: UI元素和频繁创建的对象

### 调试和性能监控
```csharp
// 集成性能分析工具
- Unity Profiler
- VR Performance Toolkit
- 自定义FPS监控器
- 内存使用监控
```

### 部署流程
1. **开发构建**: Development Build + Script Debugging
2. **性能测试**: Release构建 + Profiler连接
3. **最终发布**: Release构建 + 代码混淆

### 平台特定注意事项

#### Pico平台
- Eye tracking权限申请流程
- Pico Store上架要求
- 性能优化指南遵循

#### Quest平台  
- Meta Store政策合规
- Oculus PC App测试
- Hand tracking集成 (可选功能)

### 错误处理策略
- **VR初始化失败**: 降级到非VR模式提示
- **眼动追踪不支持**: 禁用相关功能，显示提示
- **网络连接失败**: 离线模式或重连机制

### 用户体验设计
- **舒适度设置**: 移动方式、转向方式配置
- **可访问性**: 手柄替代操作、字体大小调整
- **多语言**: UI本地化支持

## 开发优先级
1. **基础VR框架搭建** - XR Rig, 基本交互
2. **眼动追踪集成** - 设备检测、权限申请、数据获取
3. **网络通信模块** - WebSocket连接、消息处理
4. **UI系统** - 翻译结果显示、设置界面
5. **性能优化** - 帧率稳定、内存管理
6. **设备适配** - 多平台兼容性测试

## 质量检查清单
- [ ] 90 FPS稳定运行 (目标设备)
- [ ] 眼动追踪精度满足要求
- [ ] 网络断线重连机制正常
- [ ] UI响应流畅无卡顿
- [ ] 内存使用在安全范围内
- [ ] 多设备兼容性测试通过
- [ ] 用户体验流程完整
# Unity Quest 3 VR翻译应用配置指南

## 🎯 完整Unity配置步骤

### 1. 📱 项目设置 (Project Settings)

#### Player Settings
1. **Edit** → **Project Settings** → **Player**
2. **公司名称**: `VR Translation Team`
3. **产品名称**: `VR Eye Gaze Translation`
4. **默认图标**: 设置应用图标

#### Android设置 (Quest 3)
1. **平台**: 切换到 **Android**
2. **Identification**:
   - Package Name: `com.vrtranslation.eyegaze`
   - Version: `1.0`
   - Bundle Version Code: `1`
3. **Configuration**:
   - Scripting Backend: **IL2CPP**
   - API Compatibility Level: **.NET Standard 2.1**
   - Target Architectures: **ARM64** ✅

### 2. 🥽 XR配置

#### XR Plug-in Management
1. **Edit** → **Project Settings** → **XR Plug-in Management**
2. **Android tab**:
   - ✅ **OpenXR** (勾选)
3. **OpenXR**:
   - **Render Mode**: **Single Pass Instanced**
   - **Depth Submission Mode**: **Depth 24 Bit**

#### OpenXR Feature Groups
1. **项目设置** → **XR Plug-in Management** → **OpenXR**
2. **Android**: 启用以下功能
   - ✅ **Meta Quest Support**
   - ✅ **Hand Tracking**
   - ✅ **Eye Gaze Interaction Profile**

### 3. 🎮 输入系统配置

#### Input System
1. **Edit** → **Project Settings** → **Player**
2. **Active Input Handling**: **Input System Package (New)**
3. **重启Unity编辑器**

#### XR Interaction Toolkit
1. **Window** → **XR** → **XR Interaction Toolkit** → **Samples**
2. 导入 **Starter Assets**

### 4. 🏗️ 场景设置

#### 创建VR场景
1. **新建场景**: `Assets/Scenes/MainVRScene.unity`
2. **删除默认**: Main Camera
3. **添加XR Origin**:
   - **GameObject** → **XR** → **XR Origin (VR)**
   - 重命名为 `XR Origin`

#### 配置XR Origin
1. **XR Origin**:
   - **Tracking Origin Mode**: **Floor**
   - **Camera Y Offset**: `1.36` (Quest 3平均高度)
2. **Main Camera** (XR Origin的子对象):
   - **Clear Flags**: **Solid Color**
   - **Background**: 深色 `#1a1a1a`

### 5. 📡 网络管理器设置

#### 创建NetworkManager
1. **GameObject** → **Create Empty** → 命名为 `NetworkManager`
2. **添加脚本**: `NetworkManager.cs`
3. **设置参数**:
   - **Server URL**: `http://localhost:3000`
   - **WebSocket URL**: `ws://localhost:3000`

#### 配置网络连接
```csharp
// NetworkManager Inspector 设置
- API URL: "http://localhost:3000/api"
- WebSocket URL: "ws://localhost:3000"
- Connection Timeout: 5000ms
- Retry Attempts: 3
```

### 6. 👁️ 眼动追踪配置

#### Quest3HeadGazeManager
1. **GameObject** → **Create Empty** → 命名为 `GazeManager`
2. **添加脚本**: `Quest3HeadGazeManager.cs`
3. **设置参数**:
   - **Is Head Gaze Enabled**: ✅
   - **Send Interval**: `0.1` (每100ms发送一次)
   - **Gaze Ray Distance**: `8.0`
   - **Head Smoothing Factor**: `0.3`

#### 注视指示器
1. **创建球体**: **GameObject** → **3D Object** → **Sphere**
2. **重命名**: `GazeIndicator`
3. **设置Transform**:
   - **Scale**: `(0.02, 0.02, 0.02)`
4. **创建材质**: 发光蓝色材质
5. **拖拽到GazeManager**: `Gaze Indicator Prefab`

### 7. 🌐 翻译UI配置

#### Canvas设置
1. **GameObject** → **UI** → **Canvas**
2. **Canvas**:
   - **Render Mode**: **World Space**
   - **Width**: `1920`, **Height**: `1080`
   - **Scale**: `(0.001, 0.001, 0.001)`
3. **Position**: `(0, 2, 3)` (用户前方)

#### 翻译显示面板
1. **右键Canvas** → **UI** → **Panel**
2. **重命名**: `TranslationPanel`
3. **设置RectTransform**:
   - **Anchor**: Center-Middle
   - **Width**: `800`, **Height**: `200`
4. **添加Text组件**: 显示翻译结果

### 8. 🔧 质量设置

#### Graphics Settings
1. **Edit** → **Project Settings** → **Graphics**
2. **Render Pipeline**: **Universal Render Pipeline**
3. **Color Space**: **Linear**

#### Quality Settings
1. **Edit** → **Project Settings** → **Quality**
2. **Android设置**:
   - **V Sync Count**: **Don't Sync**
   - **Anti Aliasing**: **2x Multi Sampling**
   - **Anisotropic Textures**: **Per Texture**

### 9. 📦 构建设置

#### Build Settings
1. **File** → **Build Settings**
2. **Platform**: **Android**
3. **Scenes In Build**:
   - ✅ `Assets/Scenes/MainVRScene.unity`
4. **Player Settings**:
   - **Minimum API Level**: **Android 7.0 (API 24)**
   - **Target API Level**: **Android 10.0 (API 29)**

#### Development Build (调试)
- ✅ **Development Build**
- ✅ **Script Debugging**
- ✅ **Deep Profiling**

### 10. 🎮 测试配置

#### Quest 3设备设置
1. **开发者模式**: 在Quest 3中启用
2. **USB调试**: 启用
3. **连接PC**: USB线连接

#### Unity连接测试
1. **Build and Run**: 构建到Quest 3
2. **检查日志**: Unity Console
3. **网络测试**: 确保能连接到后端服务器

### 11. 📂 项目结构

```
Assets/
├── Scenes/
│   └── MainVRScene.unity
├── Scripts/
│   ├── Config/
│   │   └── ConfigManager.cs
│   ├── EyeTracking/
│   │   ├── Quest3HeadGazeManager.cs
│   │   └── GazeDetector.cs
│   ├── Network/
│   │   └── NetworkManager.cs
│   ├── Translation/
│   │   └── TranslationManager.cs
│   └── UI/
│       └── UIManager.cs
├── Prefabs/
│   ├── XR Origin.prefab
│   ├── GazeIndicator.prefab
│   └── TranslationUI.prefab
└── Materials/
    ├── GazeIndicator.mat
    └── UI.mat
```

### 12. 🔄 启动顺序

1. **启动后端服务器** (已运行: http://localhost:3000)
2. **构建Unity应用** 到Quest 3
3. **戴上头显**
4. **启动应用**
5. **看向文字** → **自动翻译**

## ✅ 配置完成检查清单

- [ ] Android平台设置正确
- [ ] OpenXR + Quest 3支持启用
- [ ] XR Origin正确配置
- [ ] 网络管理器设置API地址
- [ ] 眼动追踪管理器配置
- [ ] UI Canvas设置为世界空间
- [ ] 构建设置配置完成
- [ ] Quest 3设备连接测试

完成以上配置后，你的VR翻译应用就可以在Quest 3上运行了！🎉
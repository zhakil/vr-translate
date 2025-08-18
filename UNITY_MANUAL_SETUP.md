# Unity VR翻译项目手动设置指南

## 🎯 当前状态检查

### 1. 验证脚本编译
1. 打开Unity项目
2. 按 **Ctrl+R** 刷新项目
3. 检查 **Console** 窗口，确保没有错误
4. 如果有错误，先解决再继续

## 🏗️ 场景设置

### 1. 打开主场景
1. 在 **Project** 窗口中找到 `Assets/Scenes/MainScene.unity`
2. 双击打开场景

### 2. 创建基础GameObjects（如果不存在）
在 **Hierarchy** 窗口中创建以下对象：

#### A. 相机设置
```
MainCamera (已存在则跳过)
└── 添加组件：
    ├── HeadGazeManager 脚本
    └── EyeTrackingManager 脚本
```

#### B. 网络管理器
```
NetworkManager (新建空GameObject)
└── 添加组件：NetworkManager 脚本
```

#### C. 配置管理器
```
ConfigManager (新建空GameObject)  
└── 添加组件：ConfigManager 脚本
```

#### D. 翻译管理器
```
TranslationManager (新建空GameObject)
└── 添加组件：TranslationManager 脚本
```

#### E. UI管理器
```
UIManager (新建空GameObject)
└── 添加组件：UIManager 脚本
```

#### F. 注视检测器
```
GazeDetector (新建空GameObject)
└── 添加组件：GazeDetector 脚本
```

## 🔗 组件配置

### 1. NetworkManager 设置
选中 **NetworkManager** GameObject：
- **Server Url**: `http://localhost:3000`
- **Websocket Url**: `ws://localhost:3001`

### 2. ConfigManager 设置
选中 **ConfigManager** GameObject：
- **Translation Engine**: `mock`
- **Target Language**: `zh`
- **Gaze Time Threshold**: `1000`
- **Gaze Stability Threshold**: `50`

### 3. HeadGazeManager 设置
选中 **MainCamera** GameObject：
- **Is Head Gaze Enabled**: ✅
- **Send Interval**: `0.1`
- **Gaze Ray Distance**: `10`
- **Show Gaze Ray**: ✅ (用于调试)

### 4. EyeTrackingManager 设置
选中 **MainCamera** GameObject：
- **Is Tracking Enabled**: ✅
- **Send Interval**: `0.1`
- **Use Head Gaze In VR**: ✅
- **Head Gaze Manager**: 拖拽 MainCamera 到此字段

### 5. GazeDetector 设置
选中 **GazeDetector** GameObject：
- **Config Manager**: 拖拽 ConfigManager GameObject 到此字段

### 6. UIManager 设置（如果有UI）
如需要UI界面，创建Canvas并配置UIManager组件。

## 📱 测试用简单UI（可选）

### 1. 创建Canvas
```
Canvas (新建UI → Canvas)
├── StatusText (新建UI → Text - TextMeshPro)
├── ConnectionStatus (新建UI → Text - TextMeshPro)  
└── TranslationDisplay (新建UI → Text - TextMeshPro)
```

### 2. 配置UIManager引用
选中 **UIManager** GameObject，拖拽UI元素到对应字段：
- **Translation Text**: TranslationDisplay
- **Status Text**: StatusText  
- **Connection Status Text**: ConnectionStatus

## 🎮 基本测试步骤

### 1. 播放模式测试
1. 点击 **Play** 按钮
2. 检查 **Console** 输出：
   ```
   HeadGazeManager: Using camera transform for head tracking
   NetworkManager: Attempting to connect to server...
   EyeTrackingManager: VR Mode = False, HeadGaze Available = True
   ```

### 2. 网络连接测试
如果后端服务器运行在localhost:3000：
- Console应显示："Successfully connected to server!"
- 如果显示连接失败，这是正常的（服务器未启动）

### 3. 注视数据测试
- 在Scene视图中应该能看到红色的注视射线
- Console中应该定期显示注视数据发送日志

## 🔧 常见问题解决

### 问题1：脚本组件添加失败
**原因**：脚本编译错误
**解决**：检查Console，修复所有编译错误

### 问题2：GameObject找不到组件
**原因**：脚本文件路径不正确
**解决**：确保脚本在 `Assets/Scripts/` 对应文件夹中

### 问题3：注视射线不显示
**原因**：相机设置问题
**解决**：确保Scene视图中选中了MainCamera，且HeadGazeManager已启用

### 问题4：网络连接失败
**原因**：后端服务器未启动
**解决**：这是正常的，后续启动后端服务器即可

## ⚡ 快速验证清单

- [ ] 所有脚本编译无错误
- [ ] 主要GameObject已创建并添加对应脚本
- [ ] 组件引用已正确配置
- [ ] Play模式下Console无严重错误
- [ ] 注视射线在Scene视图中可见
- [ ] 网络管理器尝试连接服务器

## 🎯 下一步

设置完成后，你可以：
1. **添加VR包**：按照 `UNITY_VR_SETUP.md` 逐步添加XR支持
2. **启动后端**：运行 `cd backend && npm run dev` 测试完整功能
3. **创建测试内容**：添加3D文本对象测试翻译功能

**需要帮助？** 如果在设置过程中遇到问题，请告诉我具体的错误信息！
# Quest 3 头部凝视追踪设置指南

本指南将帮助您为Quest 3设备配置头部凝视追踪功能。

## 前置条件

1. Unity 2022.3 LTS 或更高版本
2. Meta XR SDK v66.0.0 或更高版本
3. Quest 3 设备
4. 已设置开发者模式的Quest 3

## Unity项目设置

### 1. 安装所需包

确保您的 `Packages/manifest.json` 包含以下依赖：

```json
{
  "dependencies": {
    "com.meta.xr.sdk.core": "66.0.0",
    "com.meta.xr.sdk.interaction": "66.0.0",
    "com.unity.xr.openxr": "1.6.0",
    "com.unity.xr.management": "4.3.3",
    "com.unity.xr.interaction.toolkit": "2.3.2"
  }
}
```

### 2. XR设置

1. 打开 **Edit > Project Settings**
2. 前往 **XR Plug-in Management**
3. 启用 **OpenXR**
4. 在 **OpenXR** 设置中：
   - 添加 **Meta Quest** 作为interaction profile
   - 启用 **Meta Quest Support**

### 3. 组件设置

#### 在您的VR场景中添加头部凝视管理器：

1. 创建一个空的GameObject，命名为"HeadGazeManager"
2. 添加以下组件之一：
   - `Quest3HeadGazeManager` (推荐，专为Quest 3优化)
   - `HeadGazeManager` (通用VR头部追踪)

#### Quest3HeadGazeManager 配置：

```csharp
// Inspector 设置示例
isHeadGazeEnabled = true
sendInterval = 0.1f           // 每秒发送10次数据
gazeRayDistance = 8f          // 凝视射线距离
headSmoothingFactor = 0.3f    // 头部移动平滑系数
useHandTrackingContext = true // 使用手部追踪上下文
minTrackingConfidence = 0.8f  // 最小追踪置信度
```

### 4. 网络配置

确保 `EyeTrackingManager` 正确引用了头部凝视管理器：

```csharp
public HeadGazeManager headGazeManager; // 在Inspector中分配
public bool useHeadGazeInVR = true;     // 在VR模式下使用头部凝视
```

## 后端配置

### 启用头部凝视模式

在后端服务器中，您可以为头部凝视设置专门的参数：

```typescript
// 创建头部凝视分析器
const gazeAnalyzer = new GazeAnalyzer(
    (gazeData) => handleGazeFixation(gazeData),
    true // headGazeMode = true
);

// 或者动态切换
gazeAnalyzer.setHeadGazeMode(true);

// 调整头部凝视参数
gazeAnalyzer.updateConfig({
    headGazeStabilityThreshold: 80,  // 更大的稳定性阈值
    headGazeTimeThreshold: 1500      // 更长的注视时间
});
```

## 构建设置

### Quest 3 构建配置

1. **File > Build Settings**
2. 切换平台到 **Android**
3. **Player Settings** 配置：
   - **Company Name**: 您的公司名称
   - **Product Name**: VR Translate
   - **Package Name**: com.yourcompany.vrtranslate
   - **Minimum API Level**: Android 10.0 (API Level 29)
   - **Target API Level**: Automatic (Highest Installed)

4. **XR Settings**:
   - **Virtual Reality Supported**: 启用
   - **Virtual Reality SDKs**: Oculus

5. **Quality Settings**:
   - 为Android平台选择合适的质量级别

## 调试和测试

### 1. 开发阶段调试

启用 Gizmos 可视化来查看头部凝视射线：

```csharp
// 在Quest3HeadGazeManager中
showGazeIndicator = true;  // 显示凝视指示器
```

### 2. 运行时调试

检查控制台输出以确认追踪状态：

```
Quest3HeadGazeManager: Head device found: Oculus Quest 3
GazeAnalyzer initialized in head gaze mode (Quest 3 optimized)
Head gaze fixation detected, triggering action.
```

### 3. 性能监控

监控以下指标：
- 追踪置信度 (`GetTrackingConfidence()`)
- 头部移动稳定性
- 网络消息发送频率

## 故障排除

### 常见问题

1. **头部追踪不工作**
   - 确认Quest 3已连接并识别
   - 检查开发者模式是否启用
   - 验证USB调试连接

2. **追踪精度低**
   - 调整 `headSmoothingFactor`
   - 降低 `minTrackingConfidence`
   - 检查环境光照条件

3. **性能问题**
   - 增加 `sendInterval` 值
   - 减少 `gazeRayDistance`
   - 优化射线检测的LayerMask

### 参数调优

根据您的应用需求调整以下参数：

```csharp
// 快速响应设置
sendInterval = 0.05f;          // 20Hz
headSmoothingFactor = 0.1f;    // 较少平滑
minTrackingConfidence = 0.7f;  // 较低置信度要求

// 稳定准确设置
sendInterval = 0.2f;           // 5Hz
headSmoothingFactor = 0.5f;    // 更多平滑
minTrackingConfidence = 0.9f;  // 更高置信度要求
```

## 下一步

设置完成后，您可以：

1. 测试头部凝视与翻译功能的集成
2. 调整凝视触发参数以适应您的使用场景
3. 添加自定义UI反馈来改善用户体验
4. 优化性能以确保流畅的VR体验

更多详细信息，请参考 [API文档](../api/README.md) 和 [系统架构文档](../architecture/system-architecture.md)。
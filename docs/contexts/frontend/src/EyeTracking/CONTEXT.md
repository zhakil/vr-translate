# EyeTracking Module Context

## 模块职责
负责VR设备眼动追踪的初始化、数据获取、处理和事件管理，为注视检测提供可靠的眼动数据。

## 开发Context

### 核心功能
1. **眼动追踪初始化**
   - 检测设备眼动追踪支持
   - 请求眼动追踪权限
   - 初始化眼动追踪系统
   - 处理初始化失败场景

2. **数据获取与处理**
   - 实时获取眼动追踪原始数据
   - 数据滤波和平滑处理
   - 坐标转换和标准化
   - 置信度评估和验证

3. **射线检测系统**
   - 注视射线生成和投射
   - 碰撞检测和对象识别
   - 距离计算和空间定位
   - 层级掩码过滤

### 主要类结构

#### EyeTrackingManager.cs
```csharp
public class EyeTrackingManager : MonoBehaviour
{
    // 配置参数
    [SerializeField] private bool enableEyeTracking;
    [SerializeField] private float trackingUpdateRate;
    [SerializeField] private float confidenceThreshold;
    [SerializeField] private float gazeRayLength;
    [SerializeField] private LayerMask gazeLayerMask;
    
    // 事件系统
    public static event Action<EyeTrackingData> OnEyeTrackingUpdate;
    public static event Action<bool> OnEyeTrackingStateChanged;
    
    // 核心方法
    private IEnumerator InitializeEyeTracking();
    private IEnumerator CheckEyeTrackingSupport();
    private IEnumerator RequestEyeTrackingPermission();
    private IEnumerator EyeTrackingUpdateLoop();
    private EyeTrackingData GetCurrentEyeTrackingData();
}
```

#### 数据结构
```csharp
[Serializable]
public struct EyeTrackingData
{
    public float Timestamp;
    public Vector3 GazeOrigin;        // 注视起点
    public Vector3 GazeDirection;     // 注视方向
    public float Confidence;          // 置信度 (0-1)
    public bool IsValid;             // 数据有效性
    
    // 射线检测结果
    public bool HasHit;              // 是否碰撞
    public Vector3 HitPoint;         // 碰撞点
    public GameObject HitObject;     // 碰撞对象
    public float HitDistance;        // 碰撞距离
}

[Serializable]
public struct EyeTrackingSettings
{
    public float UpdateRate;          // 更新频率 (Hz)
    public float ConfidenceThreshold; // 置信度阈值
    public float GazeRayLength;       // 射线长度
    public LayerMask GazeLayerMask;   // 检测层掩码
}
```

### 平台特定实现

#### Pico设备集成
```csharp
#if PICO_SDK
using Pico.Eye;

private bool InitializePicoEyeTracking()
{
    // Pico SDK眼动追踪初始化
    var result = PXR_EyeTracking.GetEyeTrackingSupported();
    if (result)
    {
        PXR_EyeTracking.StartEyeTracking();
        return true;
    }
    return false;
}

private EyeTrackingData GetPicoEyeData()
{
    var eyeData = new EyeTrackingData();
    
    // 获取Pico眼动数据
    PXR_EyeTracking.GetEyeTrackingData(out var eyeTrackingData);
    
    eyeData.GazeOrigin = eyeTrackingData.combinedEye.position;
    eyeData.GazeDirection = eyeTrackingData.combinedEye.direction;
    eyeData.Confidence = eyeTrackingData.combinedEye.confidence;
    eyeData.IsValid = eyeTrackingData.combinedEye.isValid;
    
    return eyeData;
}
#endif
```

#### Quest设备集成  
```csharp
#if OCULUS_SDK
using Oculus.Interaction;

private bool InitializeOculusEyeTracking()
{
    // Oculus SDK眼动追踪初始化
    if (OVRManager.eyeTrackingSupported)
    {
        OVRPlugin.StartEyeTracking();
        return true;
    }
    return false;
}

private EyeTrackingData GetOculusEyeData()
{
    var eyeData = new EyeTrackingData();
    
    // 获取Oculus眼动数据
    if (OVRPlugin.GetEyeGazesState(OVRPlugin.Step.Render, -1, ref eyeGazesState))
    {
        var combinedGaze = eyeGazesState.EyeGazes[0]; // Combined eye
        
        eyeData.GazeOrigin = combinedGaze.Pose.Position.FromFlippedZVector3f();
        eyeData.GazeDirection = combinedGaze.Pose.Orientation.FromFlippedZQuatf() * Vector3.forward;
        eyeData.Confidence = combinedGaze.Confidence;
        eyeData.IsValid = combinedGaze.IsValid;
    }
    
    return eyeData;
}
#endif
```

#### OpenXR通用实现
```csharp
#if OPENXR_SDK
using UnityEngine.XR;

private bool InitializeOpenXREyeTracking()
{
    // OpenXR眼动追踪初始化
    var eyeGazeDevice = InputDevices.GetDeviceAtXRNode(XRNode.CenterEye);
    return eyeGazeDevice.isValid;
}

private EyeTrackingData GetOpenXREyeData()
{
    var eyeData = new EyeTrackingData();
    
    // 获取OpenXR眼动数据
    var eyeGazeDevice = InputDevices.GetDeviceAtXRNode(XRNode.CenterEye);
    
    if (eyeGazeDevice.TryGetFeatureValue(CommonUsages.devicePosition, out Vector3 position) &&
        eyeGazeDevice.TryGetFeatureValue(CommonUsages.deviceRotation, out Quaternion rotation))
    {
        eyeData.GazeOrigin = position;
        eyeData.GazeDirection = rotation * Vector3.forward;
        eyeData.IsValid = true;
        eyeData.Confidence = 0.9f; // OpenXR通常不提供置信度
    }
    
    return eyeData;
}
#endif
```

### 数据处理算法

#### 数据平滑滤波
```csharp
public class EyeDataSmoother
{
    private Queue<Vector3> gazeDirectionHistory;
    private Queue<Vector3> gazeOriginHistory;
    private int bufferSize = 5;
    
    public EyeTrackingData SmoothData(EyeTrackingData rawData)
    {
        // 添加到历史缓冲区
        gazeDirectionHistory.Enqueue(rawData.GazeDirection);
        gazeOriginHistory.Enqueue(rawData.GazeOrigin);
        
        // 保持缓冲区大小
        if (gazeDirectionHistory.Count > bufferSize)
        {
            gazeDirectionHistory.Dequeue();
            gazeOriginHistory.Dequeue();
        }
        
        // 计算平均值
        var smoothedData = rawData;
        smoothedData.GazeDirection = CalculateAverageDirection();
        smoothedData.GazeOrigin = CalculateAveragePosition();
        
        return smoothedData;
    }
    
    private Vector3 CalculateAverageDirection()
    {
        Vector3 sum = Vector3.zero;
        foreach (var direction in gazeDirectionHistory)
        {
            sum += direction;
        }
        return (sum / gazeDirectionHistory.Count).normalized;
    }
}
```

#### 置信度评估
```csharp
public class ConfidenceEvaluator
{
    public float EvaluateConfidence(EyeTrackingData data)
    {
        float confidence = data.Confidence;
        
        // 基于稳定性调整置信度
        float stability = CalculateStability(data);
        confidence *= stability;
        
        // 基于眼睑状态调整
        float eyelidFactor = GetEyelidFactor();
        confidence *= eyelidFactor;
        
        return Mathf.Clamp01(confidence);
    }
    
    private float CalculateStability(EyeTrackingData data)
    {
        // 计算注视稳定性
        // 基于最近几帧的方向变化
        return 1.0f; // 简化实现
    }
}
```

### 射线检测优化

#### 层级化检测
```csharp
public class GazeRaycast
{
    public bool PerformRaycast(Vector3 origin, Vector3 direction, out RaycastHit hit)
    {
        // 优先检测文本层
        if (Physics.Raycast(origin, direction, out hit, gazeRayLength, textLayerMask))
        {
            return true;
        }
        
        // 其次检测UI层
        if (Physics.Raycast(origin, direction, out hit, gazeRayLength, uiLayerMask))
        {
            return true;
        }
        
        // 最后检测一般对象
        return Physics.Raycast(origin, direction, out hit, gazeRayLength, generalLayerMask);
    }
}
```

### 性能优化策略

#### 频率自适应
```csharp
public class AdaptiveUpdateRate
{
    private float currentUpdateRate = 60f;
    private float targetFrameTime = 1f / 90f; // 90 FPS目标
    
    public void UpdateRate()
    {
        float currentFrameTime = Time.unscaledDeltaTime;
        
        if (currentFrameTime > targetFrameTime * 1.1f)
        {
            // 降低更新频率
            currentUpdateRate = Mathf.Max(30f, currentUpdateRate * 0.9f);
        }
        else if (currentFrameTime < targetFrameTime * 0.9f)
        {
            // 提高更新频率
            currentUpdateRate = Mathf.Min(120f, currentUpdateRate * 1.1f);
        }
        
        trackingUpdateRate = currentUpdateRate;
    }
}
```

### 错误处理和恢复

#### 权限处理
```csharp
private IEnumerator RequestEyeTrackingPermission()
{
    // Android权限请求
    #if UNITY_ANDROID && !UNITY_EDITOR
    if (!Permission.HasUserAuthorizedPermission("android.permission.EYE_TRACKING"))
    {
        Permission.RequestUserPermission("android.permission.EYE_TRACKING");
        
        // 等待用户响应
        while (Permission.HasUserAuthorizedPermission("android.permission.EYE_TRACKING") == false)
        {
            yield return new WaitForSeconds(0.1f);
        }
    }
    #endif
    
    IsEyeTrackingEnabled = Permission.HasUserAuthorizedPermission("android.permission.EYE_TRACKING");
    yield return null;
}
```

#### 数据异常检测
```csharp
private bool ValidateEyeData(EyeTrackingData data)
{
    // 检查数据合理性
    if (!data.IsValid) return false;
    if (data.Confidence < confidenceThreshold) return false;
    if (data.GazeDirection.magnitude < 0.1f) return false;
    
    // 检查异常值
    if (Vector3.Angle(lastValidDirection, data.GazeDirection) > 45f)
    {
        // 方向变化过大，可能是异常数据
        return false;
    }
    
    return true;
}
```

### 调试和诊断工具

#### 可视化调试
```csharp
public class EyeTrackingDebugger : MonoBehaviour
{
    public bool showGazeRay = true;
    public bool showHitPoint = true;
    
    private void OnDrawGizmos()
    {
        if (!Application.isPlaying) return;
        
        var eyeData = EyeTrackingManager.Instance.GetLatestEyeData();
        
        if (showGazeRay && eyeData.IsValid)
        {
            Gizmos.color = Color.green;
            Gizmos.DrawRay(eyeData.GazeOrigin, eyeData.GazeDirection * gazeRayLength);
        }
        
        if (showHitPoint && eyeData.HasHit)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawSphere(eyeData.HitPoint, 0.05f);
        }
    }
}
```

### 配置管理

#### ScriptableObject配置
```csharp
[CreateAssetMenu(fileName = "EyeTrackingConfig", menuName = "VRTranslate/EyeTracking Config")]
public class EyeTrackingConfig : ScriptableObject
{
    [Header("基础设置")]
    public float updateRate = 60f;
    public float confidenceThreshold = 0.7f;
    public float gazeRayLength = 100f;
    
    [Header("性能设置")]
    public bool enableAdaptiveRate = true;
    public bool enableDataSmoothing = true;
    public int smoothingBufferSize = 5;
    
    [Header("调试设置")]
    public bool enableDebugVisualization = false;
    public bool logEyeTrackingEvents = false;
}
```

## 开发优先级
1. **基础眼动追踪** - 设备检测、权限、数据获取
2. **多平台适配** - Pico、Quest、OpenXR支持
3. **数据处理** - 滤波、置信度评估、异常处理
4. **射线检测** - 高效的碰撞检测系统
5. **性能优化** - 自适应频率、内存管理
6. **调试工具** - 可视化、日志、性能监控

## 质量检查清单
- [ ] 支持主流VR设备眼动追踪
- [ ] 权限申请流程完整
- [ ] 数据精度满足注视检测需求
- [ ] 性能影响控制在可接受范围
- [ ] 异常情况优雅降级
- [ ] 调试工具完整可用
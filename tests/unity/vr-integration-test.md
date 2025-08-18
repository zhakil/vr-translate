# Unity VR集成深度测试

## 🎯 高级集成测试目标

测试Unity VR翻译系统在真实使用场景下的表现，包括长期运行稳定性、极限性能测试和错误恢复能力。

## 🏗️ 高级测试场景设置

### 1. 创建复杂测试环境

#### 多语言测试文本对象
```csharp
// 创建测试文本集合
英文短句: "Hello"
英文长句: "Welcome to the Virtual Reality Translation System"
英文复杂句: "The quick brown fox jumps over the lazy dog in VR"
中文测试: "欢迎使用VR翻译系统"
日文测试: "VR翻訳システムへようこそ"
法文测试: "Bienvenue dans le système de traduction VR"
西班牙文: "Bienvenido al sistema de traducción VR"
```

#### 性能压力测试对象
```
# 创建100个文本对象用于压力测试
for i in range(100):
    - TestText_{i}: "Test text {i}"
    - Position: Random((-10,10), (0,5), (2,10))
    - Rotation: Random
    - Scale: Random(0.5, 2.0)
```

## 🧪 高级测试用例

### 测试用例A: 连续长时间运行测试
**目标**: 测试系统24小时连续运行稳定性

**测试步骤**:
1. 启动Unity Play模式
2. 启用自动注视模拟器
3. 每30秒自动触发一次截图翻译
4. 监控内存使用和性能指标
5. 记录任何错误或异常

**自动化脚本增强**:
```csharp
// 在TranslationTester中添加长期运行测试
public class LongRunningTest : MonoBehaviour
{
    public bool isRunning = false;
    public int testDuration = 86400; // 24小时 (秒)
    public float testInterval = 30f;  // 30秒间隔
    
    private int totalTests = 0;
    private int successfulTests = 0;
    private int failedTests = 0;
    
    public IEnumerator RunLongTermTest()
    {
        isRunning = true;
        float startTime = Time.time;
        
        while (Time.time - startTime < testDuration && isRunning)
        {
            // 执行测试
            yield return StartCoroutine(ExecuteSingleTranslationTest());
            
            // 记录系统状态
            LogSystemStatus();
            
            // 等待下一次测试
            yield return new WaitForSeconds(testInterval);
        }
        
        GenerateLongTermReport();
    }
    
    private void LogSystemStatus()
    {
        var memoryUsage = UnityEngine.Profiling.Profiler.GetTotalAllocatedMemory(false);
        var fps = 1.0f / Time.unscaledDeltaTime;
        
        Debug.Log($"📊 系统状态 - 内存: {memoryUsage / 1024 / 1024}MB, FPS: {fps:F1}");
    }
}
```

### 测试用例B: 极限并发压力测试
**目标**: 测试系统处理大量同时翻译请求的能力

**测试步骤**:
1. 同时创建50个翻译请求
2. 监控服务器响应时间变化
3. 检查内存泄漏和性能下降
4. 验证所有请求都得到正确处理

**压力测试脚本**:
```csharp
public IEnumerator StressTest()
{
    Debug.Log("🔥 开始极限压力测试...");
    
    var requests = new List<Coroutine>();
    
    // 同时发送50个请求
    for (int i = 0; i < 50; i++)
    {
        var request = StartCoroutine(SendTranslationRequest($"Test message {i}"));
        requests.Add(request);
    }
    
    // 等待所有请求完成
    foreach (var request in requests)
    {
        yield return request;
    }
    
    Debug.Log("✅ 压力测试完成");
}
```

### 测试用例C: 网络中断恢复测试
**目标**: 测试网络连接中断后的自动恢复能力

**测试步骤**:
1. 建立正常连接
2. 模拟网络中断 (停止后端服务)
3. 观察Unity的错误处理
4. 重启后端服务
5. 验证自动重连和功能恢复

**网络恢复测试脚本**:
```csharp
public class NetworkRecoveryTest : MonoBehaviour
{
    private bool isTestingRecovery = false;
    
    public IEnumerator TestNetworkRecovery()
    {
        Debug.Log("🔌 开始网络恢复测试...");
        
        // 第一阶段: 正常连接测试
        yield return StartCoroutine(TestNormalConnection());
        
        // 第二阶段: 模拟网络中断
        Debug.Log("⚠️ 模拟网络中断 - 请手动停止后端服务器");
        isTestingRecovery = true;
        
        // 尝试发送请求 (应该失败)
        for (int i = 0; i < 5; i++)
        {
            yield return StartCoroutine(TestConnectionFailure());
            yield return new WaitForSeconds(2f);
        }
        
        // 第三阶段: 等待服务器恢复
        Debug.log("🔄 等待服务器恢复 - 请手动重启后端服务器");
        while (isTestingRecovery)
        {
            yield return StartCoroutine(TestConnectionRecovery());
            yield return new WaitForSeconds(5f);
        }
        
        Debug.Log("✅ 网络恢复测试完成");
    }
    
    private IEnumerator TestConnectionRecovery()
    {
        // 尝试重新连接
        if (NetworkManager.Instance.TestConnection())
        {
            Debug.Log("🎉 网络连接已恢复！");
            isTestingRecovery = false;
        }
        yield return null;
    }
}
```

### 测试用例D: 多语言实时切换测试
**目标**: 测试系统处理多种语言实时切换的能力

**测试数据**:
```csharp
private Dictionary<string, string> multiLanguageTests = new Dictionary<string, string>
{
    {"en", "Hello World"},
    {"zh", "你好世界"},
    {"ja", "こんにちは世界"},
    {"fr", "Bonjour le monde"},
    {"es", "Hola mundo"},
    {"de", "Hallo Welt"},
    {"ko", "안녕하세요 세계"},
    {"ru", "Привет мир"}
};
```

## 📊 高级性能监控

### 1. Unity性能监控脚本
```csharp
public class PerformanceMonitor : MonoBehaviour
{
    private float updateInterval = 1.0f;
    private float lastUpdate = 0f;
    
    void Update()
    {
        if (Time.time - lastUpdate > updateInterval)
        {
            LogPerformanceMetrics();
            lastUpdate = Time.time;
        }
    }
    
    private void LogPerformanceMetrics()
    {
        // CPU性能
        var deltaTime = Time.unscaledDeltaTime;
        var fps = 1.0f / deltaTime;
        
        // 内存使用
        var totalMemory = UnityEngine.Profiling.Profiler.GetTotalAllocatedMemory(false);
        var reservedMemory = UnityEngine.Profiling.Profiler.GetTotalReservedMemory(false);
        
        // 网络状态
        var isConnected = NetworkManager.Instance?.IsConnected ?? false;
        
        Debug.Log($"📊 性能监控 - FPS: {fps:F1}, 内存: {totalMemory/1024/1024:F1}MB, 网络: {(isConnected ? "连接" : "断开")}");
    }
}
```

### 2. 系统资源监控
```bash
# 服务器资源监控脚本
#!/bin/bash
# monitor-resources.sh

echo "开始监控系统资源..."

while true; do
    # CPU使用率
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    
    # 内存使用
    memory_info=$(free -m | grep Mem:)
    memory_used=$(echo $memory_info | awk '{print $3}')
    memory_total=$(echo $memory_info | awk '{print $2}')
    memory_percent=$(( memory_used * 100 / memory_total ))
    
    # Node.js进程状态
    node_pid=$(pgrep -f "node simple-server.js")
    if [ ! -z "$node_pid" ]; then
        node_memory=$(ps -p $node_pid -o rss= | awk '{print $1/1024}')
        echo "$(date): CPU: ${cpu_usage}%, 内存: ${memory_percent}%, Node进程内存: ${node_memory}MB"
    else
        echo "$(date): CPU: ${cpu_usage}%, 内存: ${memory_percent}%, Node进程: 未运行"
    fi
    
    sleep 10
done
```

## 🔄 真实场景模拟测试

### 场景1: VR用户体验流程
```
用户戴上VR头盔 → 环顾四周 → 发现英文标识 → 
注视标识2秒 → 系统自动截图 → OCR识别文字 → 
调用翻译API → 在VR中显示中文翻译 → 用户理解内容
```

### 场景2: 多用户同时使用
```
用户A在房间1翻译英文菜单
用户B在房间2翻译日文指示牌  
用户C在房间3翻译法文说明
系统同时处理3个翻译请求
```

### 场景3: 复杂文档翻译
```
用户注视包含复杂术语的技术文档
系统需要保持专业术语的准确性
处理多行文本和格式保持
```

## 🐛 错误场景测试

### 错误场景A: 服务器过载
```bash
# 模拟服务器过载
for i in {1..1000}; do
    curl -X POST http://localhost:3002/api/screenshot \
         -H "Content-Type: application/json" \
         -d '{"image": "large_image_data", "sourceLang": "en", "targetLang": "zh"}' &
done
```

### 错误场景B: 无效输入处理
```csharp
// 测试各种无效输入
var invalidInputs = new string[]
{
    "", // 空字符串
    "null", // null字符串
    "很长很长的文本..." * 1000, // 超长文本
    "🎮🎯🚀", // 表情符号
    "SELECT * FROM users;", // SQL注入尝试
    "<script>alert('xss')</script>", // XSS尝试
};

foreach (var input in invalidInputs)
{
    yield return StartCoroutine(TestTranslationWithInput(input));
}
```

## 📈 基准性能测试

### Unity性能基准
```
目标指标:
- VR帧率: 90+ FPS (Quest 3)
- 注视检测延迟: <16ms (1帧)
- 截图处理时间: <100ms
- UI响应延迟: <50ms
- 内存使用: <200MB (移动VR限制)
```

### 后端性能基准
```
目标指标:
- API响应时间: <500ms (95th percentile)
- 并发处理能力: >100 requests/second
- 内存使用: <1GB
- CPU使用率: <70%
- 错误率: <0.1%
```

## 📝 测试执行计划

### Phase 1: Unity前端测试 (2小时)
1. ✅ 基础功能验证
2. 🔄 长期稳定性测试 (30分钟样本)
3. 🔄 性能压力测试
4. 🔄 多语言切换测试

### Phase 2: 网络集成测试 (1小时)
1. 🔄 网络中断恢复测试
2. 🔄 高延迟网络测试
3. 🔄 并发用户模拟测试

### Phase 3: 极限测试 (1小时)
1. 🔄 服务器过载测试
2. 🔄 内存泄漏检测
3. 🔄 错误边界测试

## 📊 预期测试结果

### 成功标准
- [ ] 所有基础功能100%工作正常
- [ ] 长期运行无内存泄漏 
- [ ] 网络中断后能自动恢复
- [ ] 支持至少10种语言实时切换
- [ ] 并发100用户无性能下降
- [ ] VR环境下保持90+ FPS
- [ ] 端到端延迟 <1秒

### 风险评估
- **高风险**: VR性能下降导致晕动症
- **中风险**: 网络不稳定影响用户体验  
- **低风险**: 特殊字符处理错误

## 🎯 下一阶段
完成Unity集成测试后，进行：
1. Quest 3真实设备测试
2. 生产环境部署测试
3. 用户验收测试 (UAT)
4. 性能调优和优化
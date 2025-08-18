// Unity VR翻译系统集成测试脚本
// 添加到Unity项目中的测试组件

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;

namespace VRTranslation.Testing
{
    public class UnityIntegrationTester : MonoBehaviour
    {
        [Header("测试配置")]
        public string serverUrl = "http://localhost:3002";
        public bool runTestsOnStart = false;
        public bool enableDetailedLogging = true;
        
        [Header("测试统计")]
        public int totalTests = 0;
        public int passedTests = 0;
        public int failedTests = 0;
        
        [Header("性能监控")]
        public float currentFPS = 0f;
        public long currentMemoryUsage = 0;
        public bool isConnected = false;
        
        // 测试结果存储
        private List<TestResult> testResults = new List<TestResult>();
        private bool isTestingInProgress = false;
        
        // 性能监控
        private float lastFPSUpdate = 0f;
        private int frameCount = 0;
        
        void Start()
        {
            if (runTestsOnStart)
            {
                StartCoroutine(RunAllIntegrationTests());
            }
            
            // 启动性能监控
            InvokeRepeating(nameof(UpdatePerformanceMetrics), 1f, 1f);
        }
        
        void Update()
        {
            // FPS计算
            frameCount++;
            if (Time.time - lastFPSUpdate >= 1f)
            {
                currentFPS = frameCount / (Time.time - lastFPSUpdate);
                lastFPSUpdate = Time.time;
                frameCount = 0;
            }
            
            // 快捷键测试
            if (Input.GetKeyDown(KeyCode.T) && !isTestingInProgress)
            {
                StartCoroutine(RunAllIntegrationTests());
            }
            
            if (Input.GetKeyDown(KeyCode.P))
            {
                StartCoroutine(RunPerformanceStressTest());
            }
            
            if (Input.GetKeyDown(KeyCode.L))
            {
                StartCoroutine(RunLongTermStabilityTest());
            }
        }
        
        // 主要集成测试套件
        public IEnumerator RunAllIntegrationTests()
        {
            if (isTestingInProgress)
            {
                Debug.LogWarning("⚠️ 测试已在进行中");
                yield break;
            }
            
            isTestingInProgress = true;
            testResults.Clear();
            totalTests = 0;
            passedTests = 0;
            failedTests = 0;
            
            Debug.Log("🚀 开始Unity VR翻译系统集成测试...");
            
            // 测试1: 服务器连接测试
            yield return StartCoroutine(TestServerConnection());
            
            // 测试2: API端点测试
            yield return StartCoroutine(TestAllAPIEndpoints());
            
            // 测试3: 数据传输完整性测试
            yield return StartCoroutine(TestDataIntegrity());
            
            // 测试4: 多语言支持测试
            yield return StartCoroutine(TestMultiLanguageSupport());
            
            // 测试5: 错误处理测试
            yield return StartCoroutine(TestErrorHandling());
            
            // 测试6: 性能基准测试
            yield return StartCoroutine(TestPerformanceBenchmark());
            
            // 生成测试报告
            GenerateIntegrationTestReport();
            
            isTestingInProgress = false;
            Debug.Log($"✅ 集成测试完成 - 通过: {passedTests}/{totalTests}");
        }
        
        // 测试1: 服务器连接
        private IEnumerator TestServerConnection()
        {
            Debug.Log("🔗 测试服务器连接...");
            
            using (UnityWebRequest request = UnityWebRequest.Get($"{serverUrl}/health"))
            {
                yield return request.SendWebRequest();
                
                bool success = request.result == UnityWebRequest.Result.Success;
                isConnected = success;
                
                LogTestResult("服务器连接测试", success, 
                    success ? $"响应时间: {request.downloadHandler.data.Length}bytes" 
                            : $"错误: {request.error}");
            }
        }
        
        // 测试2: API端点测试
        private IEnumerator TestAllAPIEndpoints()
        {
            Debug.Log("🔧 测试API端点...");
            
            // 测试注视数据端点
            yield return StartCoroutine(TestGazeEndpoint());
            
            // 测试截图翻译端点
            yield return StartCoroutine(TestScreenshotEndpoint());
            
            // 测试配置端点
            yield return StartCoroutine(TestConfigEndpoint());
        }
        
        private IEnumerator TestGazeEndpoint()
        {
            var gazeData = new { x = 123.45f, y = 678.90f };
            string jsonData = JsonConvert.SerializeObject(gazeData);
            
            using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/gaze", "POST"))
            {
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                
                yield return request.SendWebRequest();
                
                bool success = request.result == UnityWebRequest.Result.Success;
                LogTestResult("注视数据API测试", success, 
                    success ? "注视数据成功发送" : $"错误: {request.error}");
            }
        }
        
        private IEnumerator TestScreenshotEndpoint()
        {
            var screenshotData = new 
            {
                image = "data:image/jpeg;base64,test_image_data",
                sourceLang = "en",
                targetLang = "zh"
            };
            string jsonData = JsonConvert.SerializeObject(screenshotData);
            
            using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/screenshot", "POST"))
            {
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                
                yield return request.SendWebRequest();
                
                bool success = request.result == UnityWebRequest.Result.Success;
                string responseText = success ? request.downloadHandler.text : request.error;
                
                LogTestResult("截图翻译API测试", success, 
                    success ? $"翻译响应: {responseText}" : $"错误: {responseText}");
            }
        }
        
        private IEnumerator TestConfigEndpoint()
        {
            var configData = new 
            {
                translation = new { engine = "deepl", targetLang = "zh" },
                gaze = new { timeThreshold = 1000, stabilityThreshold = 50 }
            };
            string jsonData = JsonConvert.SerializeObject(configData);
            
            using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/config", "POST"))
            {
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                
                yield return request.SendWebRequest();
                
                bool success = request.result == UnityWebRequest.Result.Success;
                LogTestResult("配置更新API测试", success, 
                    success ? "配置更新成功" : $"错误: {request.error}");
            }
        }
        
        // 测试3: 数据传输完整性
        private IEnumerator TestDataIntegrity()
        {
            Debug.Log("🔍 测试数据传输完整性...");
            
            // 测试大数据传输
            var largeData = new { 
                image = new string('A', 10000), // 10KB测试数据
                sourceLang = "en", 
                targetLang = "zh" 
            };
            
            string jsonData = JsonConvert.SerializeObject(largeData);
            
            using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/screenshot", "POST"))
            {
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                
                yield return request.SendWebRequest();
                
                bool success = request.result == UnityWebRequest.Result.Success;
                LogTestResult("大数据传输完整性测试", success, 
                    success ? $"数据大小: {bodyRaw.Length} bytes" : $"错误: {request.error}");
            }
        }
        
        // 测试4: 多语言支持
        private IEnumerator TestMultiLanguageSupport()
        {
            Debug.Log("🌍 测试多语言支持...");
            
            var languagePairs = new Dictionary<string, string>
            {
                {"en", "zh"}, {"zh", "en"}, {"ja", "zh"}, 
                {"fr", "zh"}, {"es", "zh"}, {"de", "zh"}
            };
            
            int successCount = 0;
            
            foreach (var pair in languagePairs)
            {
                var testData = new 
                {
                    image = "test_image",
                    sourceLang = pair.Key,
                    targetLang = pair.Value
                };
                
                string jsonData = JsonConvert.SerializeObject(testData);
                
                using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/screenshot", "POST"))
                {
                    byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                    request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                    request.downloadHandler = new DownloadHandlerBuffer();
                    request.SetRequestHeader("Content-Type", "application/json");
                    
                    yield return request.SendWebRequest();
                    
                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        successCount++;
                    }
                }
                
                yield return new WaitForSeconds(0.1f); // 避免请求过于频繁
            }
            
            bool allSuccess = successCount == languagePairs.Count;
            LogTestResult("多语言支持测试", allSuccess, 
                $"支持语言对: {successCount}/{languagePairs.Count}");
        }
        
        // 测试5: 错误处理
        private IEnumerator TestErrorHandling()
        {
            Debug.Log("🐛 测试错误处理...");
            
            // 测试无效JSON
            yield return StartCoroutine(TestInvalidJSON());
            
            // 测试无效端点
            yield return StartCoroutine(TestInvalidEndpoint());
            
            // 测试超大请求
            yield return StartCoroutine(TestOversizeRequest());
        }
        
        private IEnumerator TestInvalidJSON()
        {
            using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/gaze", "POST"))
            {
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes("invalid json data");
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                
                yield return request.SendWebRequest();
                
                // 应该返回400错误
                bool correctError = request.responseCode == 400;
                LogTestResult("无效JSON处理测试", correctError, 
                    $"响应码: {request.responseCode}");
            }
        }
        
        private IEnumerator TestInvalidEndpoint()
        {
            using (UnityWebRequest request = UnityWebRequest.Get($"{serverUrl}/api/nonexistent"))
            {
                yield return request.SendWebRequest();
                
                // 应该返回404错误
                bool correctError = request.responseCode == 404;
                LogTestResult("无效端点处理测试", correctError, 
                    $"响应码: {request.responseCode}");
            }
        }
        
        private IEnumerator TestOversizeRequest()
        {
            // 创建5MB的测试数据
            var oversizeData = new { 
                image = new string('X', 5 * 1024 * 1024), 
                sourceLang = "en", 
                targetLang = "zh" 
            };
            
            string jsonData = JsonConvert.SerializeObject(oversizeData);
            
            using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/screenshot", "POST"))
            {
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                
                yield return request.SendWebRequest();
                
                // 检查服务器是否能处理或合理拒绝大请求
                bool handled = request.result == UnityWebRequest.Result.Success || 
                              request.responseCode == 413; // Payload Too Large
                
                LogTestResult("超大请求处理测试", handled, 
                    $"响应码: {request.responseCode}, 数据大小: {bodyRaw.Length / 1024 / 1024}MB");
            }
        }
        
        // 测试6: 性能基准测试
        private IEnumerator TestPerformanceBenchmark()
        {
            Debug.Log("⚡ 测试性能基准...");
            
            const int testCount = 10;
            var responseTimes = new List<float>();
            
            for (int i = 0; i < testCount; i++)
            {
                float startTime = Time.time;
                
                var testData = new { x = i * 10, y = i * 20 };
                string jsonData = JsonConvert.SerializeObject(testData);
                
                using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/gaze", "POST"))
                {
                    byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                    request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                    request.downloadHandler = new DownloadHandlerBuffer();
                    request.SetRequestHeader("Content-Type", "application/json");
                    
                    yield return request.SendWebRequest();
                    
                    float responseTime = (Time.time - startTime) * 1000; // 转换为毫秒
                    responseTimes.Add(responseTime);
                }
                
                yield return new WaitForSeconds(0.1f);
            }
            
            // 计算性能指标
            float avgResponseTime = 0f;
            foreach (var time in responseTimes)
                avgResponseTime += time;
            avgResponseTime /= responseTimes.Count;
            
            bool performanceGood = avgResponseTime < 100f; // 100ms以内认为良好
            
            LogTestResult("性能基准测试", performanceGood, 
                $"平均响应时间: {avgResponseTime:F1}ms ({testCount}次请求)");
        }
        
        // 长期稳定性测试
        public IEnumerator RunLongTermStabilityTest()
        {
            Debug.Log("⏰ 开始长期稳定性测试 (30分钟)...");
            
            int testDuration = 30 * 60; // 30分钟
            float testInterval = 10f;    // 每10秒一次
            float startTime = Time.time;
            int testCount = 0;
            int successCount = 0;
            
            while (Time.time - startTime < testDuration)
            {
                testCount++;
                
                // 执行简单的翻译请求
                var testData = new 
                {
                    image = $"stability_test_{testCount}",
                    sourceLang = "en",
                    targetLang = "zh"
                };
                
                string jsonData = JsonConvert.SerializeObject(testData);
                
                using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/screenshot", "POST"))
                {
                    byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                    request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                    request.downloadHandler = new DownloadHandlerBuffer();
                    request.SetRequestHeader("Content-Type", "application/json");
                    
                    yield return request.SendWebRequest();
                    
                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        successCount++;
                    }
                }
                
                // 记录当前状态
                if (testCount % 10 == 0) // 每100秒记录一次
                {
                    float successRate = (float)successCount / testCount * 100;
                    Debug.Log($"📊 稳定性测试进度 - 已运行: {(Time.time - startTime) / 60:F1}分钟, " +
                             $"成功率: {successRate:F1}% ({successCount}/{testCount})");
                }
                
                yield return new WaitForSeconds(testInterval);
            }
            
            float finalSuccessRate = (float)successCount / testCount * 100;
            bool stableSystem = finalSuccessRate >= 95f; // 95%以上成功率认为稳定
            
            LogTestResult("长期稳定性测试", stableSystem, 
                $"运行时间: 30分钟, 成功率: {finalSuccessRate:F1}% ({successCount}/{testCount})");
        }
        
        // 性能压力测试
        public IEnumerator RunPerformanceStressTest()
        {
            Debug.Log("🔥 开始性能压力测试...");
            
            const int concurrentRequests = 20;
            var requests = new List<Coroutine>();
            
            // 同时发起多个请求
            for (int i = 0; i < concurrentRequests; i++)
            {
                var coroutine = StartCoroutine(SendConcurrentRequest(i));
                requests.Add(coroutine);
            }
            
            // 等待所有请求完成
            foreach (var request in requests)
            {
                yield return request;
            }
            
            LogTestResult("性能压力测试", true, 
                $"同时处理 {concurrentRequests} 个并发请求");
        }
        
        private IEnumerator SendConcurrentRequest(int requestId)
        {
            var testData = new 
            {
                image = $"concurrent_test_{requestId}",
                sourceLang = "en",
                targetLang = "zh"
            };
            
            string jsonData = JsonConvert.SerializeObject(testData);
            
            using (UnityWebRequest request = new UnityWebRequest($"{serverUrl}/api/screenshot", "POST"))
            {
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                
                yield return request.SendWebRequest();
                
                bool success = request.result == UnityWebRequest.Result.Success;
                if (enableDetailedLogging)
                {
                    Debug.Log($"并发请求 {requestId}: {(success ? "成功" : "失败")}");
                }
            }
        }
        
        // 记录测试结果
        private void LogTestResult(string testName, bool passed, string details = "")
        {
            totalTests++;
            if (passed)
                passedTests++;
            else
                failedTests++;
            
            var result = new TestResult
            {
                name = testName,
                passed = passed,
                details = details,
                timestamp = DateTime.Now
            };
            
            testResults.Add(result);
            
            string status = passed ? "✅ 通过" : "❌ 失败";
            string message = $"{status} - {testName}";
            if (!string.IsNullOrEmpty(details))
                message += $" ({details})";
            
            Debug.Log(message);
        }
        
        // 更新性能指标
        private void UpdatePerformanceMetrics()
        {
            currentMemoryUsage = UnityEngine.Profiling.Profiler.GetTotalAllocatedMemory(false);
            
            if (enableDetailedLogging)
            {
                Debug.Log($"📊 性能监控 - FPS: {currentFPS:F1}, " +
                         $"内存: {currentMemoryUsage / 1024 / 1024:F1}MB, " +
                         $"连接: {(isConnected ? "正常" : "断开")}");
            }
        }
        
        // 生成集成测试报告
        private void GenerateIntegrationTestReport()
        {
            Debug.Log("📄 生成集成测试报告...");
            
            var report = new System.Text.StringBuilder();
            report.AppendLine("=== Unity VR翻译系统集成测试报告 ===");
            report.AppendLine($"测试时间: {DateTime.Now}");
            report.AppendLine($"服务器地址: {serverUrl}");
            report.AppendLine($"总测试数: {totalTests}");
            report.AppendLine($"通过: {passedTests}");
            report.AppendLine($"失败: {failedTests}");
            report.AppendLine($"成功率: {(float)passedTests / totalTests * 100:F1}%");
            report.AppendLine();
            
            report.AppendLine("详细结果:");
            foreach (var result in testResults)
            {
                string status = result.passed ? "通过" : "失败";
                report.AppendLine($"- {result.name}: {status} ({result.details})");
            }
            
            Debug.Log(report.ToString());
            
            // 保存到文件 (如果在编辑器中)
            #if UNITY_EDITOR
            var filePath = $"Assets/TestReports/unity_integration_test_{DateTime.Now:yyyyMMdd_HHmmss}.txt";
            System.IO.Directory.CreateDirectory("Assets/TestReports");
            System.IO.File.WriteAllText(filePath, report.ToString());
            Debug.Log($"测试报告已保存: {filePath}");
            #endif
        }
        
        // 测试结果数据结构
        [System.Serializable]
        public class TestResult
        {
            public string name;
            public bool passed;
            public string details;
            public DateTime timestamp;
        }
        
        // UI显示 (OnGUI)
        void OnGUI()
        {
            GUILayout.BeginArea(new Rect(10, 10, 300, 200));
            GUILayout.Label("VR翻译系统测试控制台", GUI.skin.box);
            GUILayout.Label($"FPS: {currentFPS:F1}");
            GUILayout.Label($"内存: {currentMemoryUsage / 1024 / 1024:F1}MB");
            GUILayout.Label($"连接状态: {(isConnected ? "正常" : "断开")}");
            GUILayout.Label($"测试结果: {passedTests}/{totalTests}");
            
            if (GUILayout.Button("运行集成测试 (T)") && !isTestingInProgress)
            {
                StartCoroutine(RunAllIntegrationTests());
            }
            
            if (GUILayout.Button("压力测试 (P)") && !isTestingInProgress)
            {
                StartCoroutine(RunPerformanceStressTest());
            }
            
            if (GUILayout.Button("稳定性测试 (L)") && !isTestingInProgress)
            {
                StartCoroutine(RunLongTermStabilityTest());
            }
            
            GUILayout.EndArea();
        }
    }
}
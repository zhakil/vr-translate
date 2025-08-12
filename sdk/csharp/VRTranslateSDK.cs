using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.IO;

namespace VRTranslation.SDK
{
    /// <summary>
    /// VR Translation Service C# SDK
    /// 完整的外部调用客户端SDK，支持REST API和WebSocket实时通信
    /// </summary>
    public class VRTranslateSDK : IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly string _websocketUrl;
        private readonly int _timeout;
        private readonly int _retries;
        private readonly bool _debug;
        
        private ClientWebSocket _webSocket;
        private readonly Dictionary<string, List<Action<WebSocketMessage>>> _wsListeners;
        private int _requestId = 0;
        private CancellationTokenSource _cancellationTokenSource;

        /// <summary>
        /// 初始化SDK
        /// </summary>
        /// <param name="baseUrl">REST API基础URL</param>
        /// <param name="websocketUrl">WebSocket服务器URL</param>
        /// <param name="timeout">请求超时时间（秒）</param>
        /// <param name="retries">重试次数</param>
        /// <param name="debug">是否启用调试模式</param>
        public VRTranslateSDK(string baseUrl = "http://localhost:8080", 
                             string websocketUrl = "ws://localhost:8081",
                             int timeout = 10, int retries = 3, bool debug = false)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _websocketUrl = websocketUrl;
            _timeout = timeout;
            _retries = retries;
            _debug = debug;
            
            _httpClient = new HttpClient()
            {
                Timeout = TimeSpan.FromSeconds(timeout)
            };
            
            _wsListeners = new Dictionary<string, List<Action<WebSocketMessage>>>();
            _cancellationTokenSource = new CancellationTokenSource();
            
            if (_debug)
            {
                Console.WriteLine($"[VRTranslateSDK] SDK初始化完成 - {_baseUrl}");
            }
        }

        #region REST API方法

        /// <summary>
        /// 翻译文本
        /// </summary>
        /// <param name="text">要翻译的文本</param>
        /// <param name="sourceLang">源语言代码，默认'auto'</param>
        /// <param name="targetLang">目标语言代码，默认'zh-CN'</param>
        /// <returns>翻译结果</returns>
        public async Task<TranslationResult> TranslateAsync(string text, string sourceLang = "auto", string targetLang = "zh-CN")
        {
            var data = new
            {
                text = text,
                sourceLang = sourceLang,
                targetLang = targetLang
            };
            
            var response = await RequestAsync<ApiResponse<TranslationResult>>("POST", "/api/translate", data);
            
            if (_debug)
            {
                Console.WriteLine($"[VRTranslateSDK] 翻译完成: {response.Data.Translation}");
            }
            
            return response.Data;
        }

        /// <summary>
        /// 批量翻译
        /// </summary>
        /// <param name="texts">要翻译的文本数组</param>
        /// <param name="sourceLang">源语言代码，默认'auto'</param>
        /// <param name="targetLang">目标语言代码，默认'zh-CN'</param>
        /// <returns>批量翻译结果</returns>
        public async Task<BatchTranslationResult> BatchTranslateAsync(string[] texts, string sourceLang = "auto", string targetLang = "zh-CN")
        {
            if (texts == null || texts.Length == 0)
            {
                throw new ArgumentException("texts must be a non-empty array");
            }

            if (texts.Length > 100)
            {
                throw new ArgumentException("Maximum 100 texts allowed for batch translation");
            }

            var data = new
            {
                texts = texts,
                sourceLang = sourceLang,
                targetLang = targetLang
            };
            
            var response = await RequestAsync<ApiResponse<BatchTranslationResult>>("POST", "/api/translate/batch", data);
            
            if (_debug)
            {
                Console.WriteLine($"[VRTranslateSDK] 批量翻译完成: {response.Data.Successful}/{response.Data.Total}");
            }
            
            return response.Data;
        }

        /// <summary>
        /// OCR识别图片文字
        /// </summary>
        /// <param name="image">Base64编码的图片或字节数组</param>
        /// <param name="lang">识别语言，默认'auto'</param>
        /// <returns>OCR识别结果</returns>
        public async Task<OCRResult> OCRAsync(string image, string lang = "auto")
        {
            var data = new
            {
                image = image,
                lang = lang
            };
            
            var response = await RequestAsync<ApiResponse<OCRResult>>("POST", "/api/ocr", data);
            
            if (_debug)
            {
                Console.WriteLine($"[VRTranslateSDK] OCR识别完成: {response.Data.Text}");
            }
            
            return response.Data;
        }

        /// <summary>
        /// OCR识别图片文字（字节数组）
        /// </summary>
        /// <param name="imageBytes">图片字节数组</param>
        /// <param name="lang">识别语言，默认'auto'</param>
        /// <returns>OCR识别结果</returns>
        public async Task<OCRResult> OCRAsync(byte[] imageBytes, string lang = "auto")
        {
            var base64Image = $"data:image/png;base64,{Convert.ToBase64String(imageBytes)}";
            return await OCRAsync(base64Image, lang);
        }

        /// <summary>
        /// OCR识别后翻译
        /// </summary>
        /// <param name="image">Base64编码的图片</param>
        /// <param name="sourceLang">源语言代码，默认'auto'</param>
        /// <param name="targetLang">目标语言代码，默认'zh-CN'</param>
        /// <returns>OCR+翻译结果</returns>
        public async Task<TranslationResult> OCRTranslateAsync(string image, string sourceLang = "auto", string targetLang = "zh-CN")
        {
            var data = new
            {
                image = image,
                sourceLang = sourceLang,
                targetLang = targetLang
            };
            
            var response = await RequestAsync<ApiResponse<TranslationResult>>("POST", "/api/ocr-translate", data);
            
            if (_debug)
            {
                Console.WriteLine($"[VRTranslateSDK] OCR+翻译完成: {response.Data.Translation}");
            }
            
            return response.Data;
        }

        /// <summary>
        /// OCR识别后翻译（字节数组）
        /// </summary>
        /// <param name="imageBytes">图片字节数组</param>
        /// <param name="sourceLang">源语言代码，默认'auto'</param>
        /// <param name="targetLang">目标语言代码，默认'zh-CN'</param>
        /// <returns>OCR+翻译结果</returns>
        public async Task<TranslationResult> OCRTranslateAsync(byte[] imageBytes, string sourceLang = "auto", string targetLang = "zh-CN")
        {
            var base64Image = $"data:image/png;base64,{Convert.ToBase64String(imageBytes)}";
            return await OCRTranslateAsync(base64Image, sourceLang, targetLang);
        }

        /// <summary>
        /// 获取支持的语言列表
        /// </summary>
        /// <returns>语言列表</returns>
        public async Task<LanguagesResult> GetLanguagesAsync()
        {
            var response = await RequestAsync<ApiResponse<LanguagesResult>>("GET", "/api/languages");
            return response.Data;
        }

        /// <summary>
        /// 获取服务统计信息
        /// </summary>
        /// <returns>统计信息</returns>
        public async Task<StatsResult> GetStatsAsync()
        {
            var response = await RequestAsync<ApiResponse<StatsResult>>("GET", "/api/stats");
            return response.Data;
        }

        #endregion

        #region WebSocket方法

        /// <summary>
        /// 连接WebSocket服务器
        /// </summary>
        public async Task ConnectWebSocketAsync()
        {
            try
            {
                _webSocket = new ClientWebSocket();
                await _webSocket.ConnectAsync(new Uri(_websocketUrl), _cancellationTokenSource.Token);
                
                if (_debug)
                {
                    Console.WriteLine("[VRTranslateSDK] WebSocket连接已建立");
                }
                
                // 启动消息监听任务
                _ = Task.Run(WebSocketListenerAsync);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VRTranslateSDK] WebSocket连接失败: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// 断开WebSocket连接
        /// </summary>
        public async Task DisconnectWebSocketAsync()
        {
            if (_webSocket?.State == WebSocketState.Open)
            {
                await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client disconnect", CancellationToken.None);
                _webSocket?.Dispose();
                _webSocket = null;
                _wsListeners.Clear();
                
                if (_debug)
                {
                    Console.WriteLine("[VRTranslateSDK] WebSocket连接已关闭");
                }
            }
        }

        /// <summary>
        /// 发送眼动数据
        /// </summary>
        /// <param name="gazeData">眼动数据</param>
        public async Task SendGazeDataAsync(object gazeData)
        {
            await SendWebSocketMessageAsync("gaze", gazeData);
        }

        /// <summary>
        /// 发送截图请求
        /// </summary>
        /// <param name="screenshotData">截图数据</param>
        public async Task SendScreenshotAsync(object screenshotData)
        {
            await SendWebSocketMessageAsync("screenshot", screenshotData);
        }

        /// <summary>
        /// 发送配置更新
        /// </summary>
        /// <param name="config">配置数据</param>
        public async Task SendConfigAsync(object config)
        {
            await SendWebSocketMessageAsync("config", config);
        }

        /// <summary>
        /// 监听WebSocket消息
        /// </summary>
        /// <param name="messageType">消息类型</param>
        /// <param name="callback">回调函数</param>
        public void OnWebSocketMessage(string messageType, Action<WebSocketMessage> callback)
        {
            if (!_wsListeners.ContainsKey(messageType))
            {
                _wsListeners[messageType] = new List<Action<WebSocketMessage>>();
            }
            _wsListeners[messageType].Add(callback);
        }

        /// <summary>
        /// 移除WebSocket消息监听器
        /// </summary>
        /// <param name="messageType">消息类型</param>
        /// <param name="callback">回调函数</param>
        public void OffWebSocketMessage(string messageType, Action<WebSocketMessage> callback)
        {
            if (_wsListeners.ContainsKey(messageType))
            {
                _wsListeners[messageType].Remove(callback);
            }
        }

        #endregion

        #region 内部辅助方法

        private async Task<T> RequestAsync<T>(string method, string path, object data = null)
        {
            var url = $"{_baseUrl}{path}";
            
            // 重试机制
            for (int attempt = 1; attempt <= _retries; attempt++)
            {
                try
                {
                    HttpResponseMessage response;
                    
                    switch (method.ToUpper())
                    {
                        case "GET":
                            response = await _httpClient.GetAsync(url);
                            break;
                        case "POST":
                            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions 
                            { 
                                PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
                            });
                            var content = new StringContent(json, Encoding.UTF8, "application/json");
                            response = await _httpClient.PostAsync(url, content);
                            break;
                        default:
                            throw new NotSupportedException($"HTTP method {method} not supported");
                    }
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        throw new HttpRequestException($"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}");
                    }
                    
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<T>(responseContent, new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    });
                    
                    return result;
                }
                catch (Exception ex)
                {
                    if (attempt == _retries)
                    {
                        throw;
                    }
                    
                    if (_debug)
                    {
                        Console.WriteLine($"[VRTranslateSDK] 请求失败，正在重试 {attempt}/{_retries}: {ex.Message}");
                    }
                    
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt))); // 指数退避
                }
            }
            
            throw new InvalidOperationException("Should not reach here");
        }

        private async Task SendWebSocketMessageAsync(string messageType, object payload)
        {
            if (_webSocket?.State != WebSocketState.Open)
            {
                throw new InvalidOperationException("WebSocket未连接");
            }
            
            var message = new
            {
                type = messageType,
                payload = payload,
                id = ++_requestId,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
            
            var json = JsonSerializer.Serialize(message, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
            });
            var bytes = Encoding.UTF8.GetBytes(json);
            
            await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _cancellationTokenSource.Token);
            
            if (_debug)
            {
                Console.WriteLine($"[VRTranslateSDK] 发送WebSocket消息: {json}");
            }
        }

        private async Task WebSocketListenerAsync()
        {
            var buffer = new byte[4096];
            
            try
            {
                while (_webSocket?.State == WebSocketState.Open && !_cancellationTokenSource.Token.IsCancellationRequested)
                {
                    var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cancellationTokenSource.Token);
                    
                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        try
                        {
                            var message = JsonSerializer.Deserialize<WebSocketMessage>(json, new JsonSerializerOptions 
                            { 
                                PropertyNameCaseInsensitive = true 
                            });
                            
                            HandleWebSocketMessage(message);
                        }
                        catch (JsonException ex)
                        {
                            Console.WriteLine($"[VRTranslateSDK] 解析WebSocket消息失败: {ex.Message}");
                        }
                    }
                    else if (result.MessageType == WebSocketMessageType.Close)
                    {
                        if (_debug)
                        {
                            Console.WriteLine("[VRTranslateSDK] WebSocket连接已关闭");
                        }
                        break;
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // 正常取消操作
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[VRTranslateSDK] WebSocket监听器错误: {ex.Message}");
            }
        }

        private void HandleWebSocketMessage(WebSocketMessage message)
        {
            if (_debug)
            {
                Console.WriteLine($"[VRTranslateSDK] 收到WebSocket消息: {message.Type}");
            }
            
            if (_wsListeners.ContainsKey(message.Type))
            {
                foreach (var callback in _wsListeners[message.Type])
                {
                    try
                    {
                        callback(message);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[VRTranslateSDK] WebSocket消息处理错误: {ex.Message}");
                    }
                }
            }
        }

        #endregion

        #region IDisposable实现

        public void Dispose()
        {
            DisconnectWebSocketAsync().GetAwaiter().GetResult();
            _httpClient?.Dispose();
            _cancellationTokenSource?.Dispose();
        }

        #endregion
    }

    #region 数据模型

    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T Data { get; set; }
        public string Error { get; set; }
        public string Message { get; set; }
    }

    public class TranslationResult
    {
        public string Original { get; set; }
        public string Translation { get; set; }
        public string SourceLang { get; set; }
        public string TargetLang { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class BatchTranslationResult
    {
        public List<BatchTranslationItem> Results { get; set; }
        public int Total { get; set; }
        public int Successful { get; set; }
        public int Failed { get; set; }
        public string SourceLang { get; set; }
        public string TargetLang { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class BatchTranslationItem
    {
        public int Index { get; set; }
        public string Original { get; set; }
        public string Translation { get; set; }
        public bool Success { get; set; }
        public string Error { get; set; }
    }

    public class OCRResult
    {
        public string Text { get; set; }
        public string Language { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class LanguagesResult
    {
        public List<Language> Common { get; set; }
        public List<Language> All { get; set; }
    }

    public class Language
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string NativeName { get; set; }
    }

    public class StatsResult
    {
        public ServiceInfo Service { get; set; }
        public PerformanceInfo Performance { get; set; }
        public FeaturesInfo Features { get; set; }
        public LimitsInfo Limits { get; set; }
    }

    public class ServiceInfo
    {
        public string Name { get; set; }
        public string Version { get; set; }
        public double Uptime { get; set; }
        public string Status { get; set; }
    }

    public class PerformanceInfo
    {
        public object MemoryUsage { get; set; }
        public object CpuUsage { get; set; }
        public string ResponseTime { get; set; }
    }

    public class FeaturesInfo
    {
        public bool TextTranslation { get; set; }
        public bool OcrRecognition { get; set; }
        public bool BatchTranslation { get; set; }
        public bool WebsocketSupport { get; set; }
        public bool MultiLanguage { get; set; }
    }

    public class LimitsInfo
    {
        public int MaxTextLength { get; set; }
        public int MaxBatchSize { get; set; }
        public string MaxImageSize { get; set; }
        public string RateLimit { get; set; }
    }

    public class WebSocketMessage
    {
        public string Type { get; set; }
        public object Payload { get; set; }
        public int Id { get; set; }
        public long Timestamp { get; set; }
    }

    #endregion
}

// 使用示例
/*
class Program
{
    static async Task Main(string[] args)
    {
        using var sdk = new VRTranslateSDK(debug: true);
        
        try
        {
            // REST API调用示例
            Console.WriteLine("=== REST API示例 ===");
            
            // 翻译文本
            var result = await sdk.TranslateAsync("Hello World", "en", "zh-CN");
            Console.WriteLine($"翻译结果: {result.Translation}");
            
            // 批量翻译
            var batchResult = await sdk.BatchTranslateAsync(
                new[] { "Hello", "World", "Good morning" }, "en", "zh-CN");
            Console.WriteLine($"批量翻译结果: {batchResult.Successful}/{batchResult.Total}");
            
            // 获取支持的语言
            var languages = await sdk.GetLanguagesAsync();
            Console.WriteLine($"支持的语言: {languages.Common.Count}种");
            
            // WebSocket调用示例
            Console.WriteLine("\n=== WebSocket示例 ===");
            
            // 连接WebSocket
            await sdk.ConnectWebSocketAsync();
            
            // 设置消息监听器
            sdk.OnWebSocketMessage("translation_result", message =>
            {
                Console.WriteLine($"收到翻译结果: {message.Payload}");
            });
            
            // 发送眼动数据
            await sdk.SendGazeDataAsync(new
            {
                x = 100,
                y = 200,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                confidence = 0.95
            });
            
            // 等待消息
            await Task.Delay(2000);
            
        }
        catch (Exception ex)
        {
            Console.WriteLine($"调用失败: {ex.Message}");
        }
    }
}
*/
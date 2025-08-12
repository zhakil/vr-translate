# Network Module Context

## 模块职责
负责VR应用与后端翻译服务之间的网络通信，包括WebSocket连接管理、消息序列化/反序列化、错误处理和重连机制。

## 开发Context

### 核心功能
1. **WebSocket连接管理**
   - 建立和维护WebSocket连接
   - 连接状态监控和管理
   - 自动重连机制
   - 连接质量评估

2. **消息处理系统**
   - 消息序列化和反序列化
   - 消息队列管理
   - 消息确认和重发
   - 消息优先级处理

3. **协议实现**
   - WebSocket通信协议实现
   - 握手和认证流程
   - 心跳机制
   - 错误码处理

### 主要类结构

#### NetworkManager.cs
```csharp
public class NetworkManager : MonoBehaviour
{
    [Header("连接配置")]
    [SerializeField] private string serverHost = "localhost";
    [SerializeField] private int serverPort = 8081;
    [SerializeField] private bool useSSL = false;
    [SerializeField] private float connectionTimeout = 10f;
    [SerializeField] private int maxReconnectAttempts = 5;
    
    [Header("消息配置")]
    [SerializeField] private int maxQueueSize = 100;
    [SerializeField] private float heartbeatInterval = 30f;
    [SerializeField] private float messageTimeout = 10f;
    
    // 连接状态
    public ConnectionState CurrentState { get; private set; }
    public bool IsConnected => CurrentState == ConnectionState.Connected;
    public string ClientId { get; private set; }
    
    // 事件系统
    public static event Action<ConnectionState> OnConnectionStateChanged;
    public static event Action<NetworkMessage> OnMessageReceived;
    public static event Action<NetworkError> OnNetworkError;
    
    // 核心方法
    public async Task<bool> ConnectAsync();
    public void Disconnect();
    public void SendMessage(NetworkMessage message);
    public void SendMessageWithResponse<T>(NetworkMessage message, Action<T> onResponse);
}
```

#### WebSocketClient.cs  
```csharp
public class WebSocketClient : IDisposable
{
    private WebSocket webSocket;
    private CancellationTokenSource cancellationTokenSource;
    private readonly Queue<string> sendQueue = new Queue<string>();
    private readonly Dictionary<string, TaskCompletionSource<string>> pendingResponses;
    
    public event Action<string> OnMessageReceived;
    public event Action<WebSocketCloseCode> OnClosed;
    public event Action<Exception> OnError;
    
    public async Task ConnectAsync(string uri)
    {
        try
        {
            webSocket = new ClientWebSocket();
            await webSocket.ConnectAsync(new Uri(uri), cancellationTokenSource.Token);
            
            // 开始接收消息
            _ = Task.Run(ReceiveLoop);
            _ = Task.Run(SendLoop);
        }
        catch (Exception ex)
        {
            OnError?.Invoke(ex);
        }
    }
    
    private async Task ReceiveLoop()
    {
        var buffer = new byte[4096];
        while (webSocket.State == WebSocketState.Open)
        {
            var result = await webSocket.ReceiveAsync(
                new ArraySegment<byte>(buffer), 
                cancellationTokenSource.Token
            );
            
            if (result.MessageType == WebSocketMessageType.Text)
            {
                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                OnMessageReceived?.Invoke(message);
            }
        }
    }
    
    public async Task SendAsync(string message)
    {
        if (webSocket.State == WebSocketState.Open)
        {
            var buffer = Encoding.UTF8.GetBytes(message);
            await webSocket.SendAsync(
                new ArraySegment<byte>(buffer),
                WebSocketMessageType.Text,
                true,
                cancellationTokenSource.Token
            );
        }
    }
}
```

### 消息系统

#### 消息基类
```csharp
[Serializable]
public abstract class NetworkMessage
{
    public string id = Guid.NewGuid().ToString();
    public string type;
    public long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public string clientId;
    
    public NetworkMessage(string messageType)
    {
        type = messageType;
    }
}

// 具体消息类型
[Serializable]
public class GazeDataMessage : NetworkMessage
{
    public EyeTrackingData data;
    
    public GazeDataMessage() : base("gaze_data") { }
}

[Serializable]
public class TranslationRequestMessage : NetworkMessage
{
    public TranslationRequestData data;
    
    public TranslationRequestMessage() : base("translation_request") { }
}

[Serializable]
public class TranslationResultMessage : NetworkMessage
{
    public TranslationResultData data;
    
    public TranslationResultMessage() : base("translation_result") { }
}
```

#### 消息序列化器
```csharp
public static class MessageSerializer
{
    public static string SerializeMessage(NetworkMessage message)
    {
        try
        {
            return JsonUtility.ToJson(message);
        }
        catch (Exception ex)
        {
            Debug.LogError($"消息序列化失败: {ex.Message}");
            return null;
        }
    }
    
    public static T DeserializeMessage<T>(string json) where T : NetworkMessage
    {
        try
        {
            return JsonUtility.FromJson<T>(json);
        }
        catch (Exception ex)
        {
            Debug.LogError($"消息反序列化失败: {ex.Message}");
            return null;
        }
    }
    
    public static NetworkMessage DeserializeMessage(string json)
    {
        try
        {
            // 首先解析获取消息类型
            var baseMessage = JsonUtility.FromJson<BaseMessageType>(json);
            
            // 根据类型创建具体消息对象
            return baseMessage.type switch
            {
                "gaze_data" => JsonUtility.FromJson<GazeDataMessage>(json),
                "translation_request" => JsonUtility.FromJson<TranslationRequestMessage>(json),
                "translation_result" => JsonUtility.FromJson<TranslationResultMessage>(json),
                "error" => JsonUtility.FromJson<ErrorMessage>(json),
                _ => null
            };
        }
        catch (Exception ex)
        {
            Debug.LogError($"消息反序列化失败: {ex.Message}");
            return null;
        }
    }
}
```

### 连接管理

#### 连接状态机
```csharp
public enum ConnectionState
{
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Error
}

public class ConnectionStateMachine
{
    private ConnectionState currentState = ConnectionState.Disconnected;
    private readonly NetworkManager networkManager;
    
    public void TransitionTo(ConnectionState newState)
    {
        if (currentState == newState) return;
        
        Debug.Log($"连接状态变化: {currentState} -> {newState}");
        
        var previousState = currentState;
        currentState = newState;
        
        OnStateChanged(previousState, newState);
        NetworkManager.OnConnectionStateChanged?.Invoke(newState);
    }
    
    private void OnStateChanged(ConnectionState from, ConnectionState to)
    {
        switch (to)
        {
            case ConnectionState.Connected:
                OnConnected();
                break;
            case ConnectionState.Disconnected:
                OnDisconnected();
                break;
            case ConnectionState.Error:
                OnError();
                break;
        }
    }
}
```

#### 重连机制
```csharp
public class ReconnectionManager
{
    private int reconnectAttempts = 0;
    private readonly int maxReconnectAttempts;
    private readonly float[] reconnectDelays = { 1f, 2f, 4f, 8f, 16f };
    private Coroutine reconnectCoroutine;
    
    public async Task<bool> TryReconnectAsync()
    {
        if (reconnectAttempts >= maxReconnectAttempts)
        {
            Debug.LogError("达到最大重连次数，停止重连");
            return false;
        }
        
        var delay = reconnectDelays[Mathf.Min(reconnectAttempts, reconnectDelays.Length - 1)];
        await Task.Delay(TimeSpan.FromSeconds(delay));
        
        reconnectAttempts++;
        Debug.Log($"尝试重连 (第{reconnectAttempts}次)...");
        
        try
        {
            var connected = await networkManager.ConnectAsync();
            if (connected)
            {
                reconnectAttempts = 0; // 重置重连计数
                return true;
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"重连失败: {ex.Message}");
        }
        
        return false;
    }
    
    public void ResetReconnectAttempts()
    {
        reconnectAttempts = 0;
    }
}
```

### 心跳机制

#### 心跳管理器
```csharp
public class HeartbeatManager
{
    private float heartbeatInterval = 30f;
    private float lastHeartbeatTime;
    private float lastPongTime;
    private bool waitingForPong = false;
    private Coroutine heartbeatCoroutine;
    
    public void StartHeartbeat()
    {
        if (heartbeatCoroutine != null)
        {
            StopCoroutine(heartbeatCoroutine);
        }
        heartbeatCoroutine = StartCoroutine(HeartbeatLoop());
    }
    
    private IEnumerator HeartbeatLoop()
    {
        while (networkManager.IsConnected)
        {
            yield return new WaitForSeconds(heartbeatInterval);
            
            if (waitingForPong && Time.time - lastHeartbeatTime > heartbeatInterval * 2)
            {
                // 心跳超时，连接可能已断开
                Debug.LogWarning("心跳超时，可能连接已断开");
                networkManager.OnConnectionLost();
                break;
            }
            
            SendHeartbeat();
        }
    }
    
    private void SendHeartbeat()
    {
        var heartbeatMessage = new HeartbeatMessage
        {
            clientTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        
        networkManager.SendMessage(heartbeatMessage);
        lastHeartbeatTime = Time.time;
        waitingForPong = true;
    }
    
    public void OnPongReceived(HeartbeatMessage pong)
    {
        waitingForPong = false;
        lastPongTime = Time.time;
        
        // 计算网络延迟
        var currentTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var latency = currentTime - pong.clientTimestamp;
        
        Debug.Log($"网络延迟: {latency}ms");
    }
}
```

### 消息队列管理

#### 消息队列
```csharp
public class MessageQueue
{
    private readonly Queue<QueuedMessage> sendQueue = new Queue<QueuedMessage>();
    private readonly Dictionary<string, QueuedMessage> pendingMessages = new Dictionary<string, QueuedMessage>();
    private readonly int maxQueueSize;
    
    public void EnqueueMessage(NetworkMessage message, MessagePriority priority = MessagePriority.Normal)
    {
        if (sendQueue.Count >= maxQueueSize)
        {
            Debug.LogWarning("发送队列已满，丢弃最旧的消息");
            sendQueue.Dequeue();
        }
        
        var queuedMessage = new QueuedMessage
        {
            message = message,
            priority = priority,
            timestamp = Time.time,
            retryCount = 0
        };
        
        sendQueue.Enqueue(queuedMessage);
    }
    
    public QueuedMessage DequeueMessage()
    {
        if (sendQueue.Count == 0) return null;
        
        // 按优先级排序
        var orderedMessages = sendQueue.OrderByDescending(m => m.priority).ToArray();
        sendQueue.Clear();
        
        foreach (var msg in orderedMessages.Skip(1))
        {
            sendQueue.Enqueue(msg);
        }
        
        return orderedMessages.FirstOrDefault();
    }
    
    public void MarkMessageAsPending(string messageId, QueuedMessage message)
    {
        pendingMessages[messageId] = message;
    }
    
    public void ConfirmMessage(string messageId)
    {
        pendingMessages.Remove(messageId);
    }
    
    public void RetryPendingMessages()
    {
        var expiredMessages = pendingMessages.Values
            .Where(m => Time.time - m.timestamp > messageTimeout)
            .ToList();
        
        foreach (var message in expiredMessages)
        {
            if (message.retryCount < maxRetryCount)
            {
                message.retryCount++;
                EnqueueMessage(message.message, message.priority);
            }
            
            pendingMessages.Remove(message.message.id);
        }
    }
}
```

### 错误处理

#### 网络错误管理
```csharp
public class NetworkErrorHandler
{
    public void HandleError(Exception exception)
    {
        var error = ClassifyError(exception);
        LogError(error);
        
        switch (error.type)
        {
            case NetworkErrorType.ConnectionLost:
                networkManager.StartReconnection();
                break;
            case NetworkErrorType.Timeout:
                networkManager.RetryLastMessage();
                break;
            case NetworkErrorType.ServerError:
                networkManager.ShowErrorMessage(error.message);
                break;
            case NetworkErrorType.AuthenticationFailed:
                networkManager.RequestReauthentication();
                break;
        }
        
        NetworkManager.OnNetworkError?.Invoke(error);
    }
    
    private NetworkError ClassifyError(Exception exception)
    {
        return exception switch
        {
            SocketException => new NetworkError(NetworkErrorType.ConnectionLost, "网络连接丢失"),
            TimeoutException => new NetworkError(NetworkErrorType.Timeout, "请求超时"),
            WebSocketException => new NetworkError(NetworkErrorType.ProtocolError, "WebSocket协议错误"),
            UnauthorizedAccessException => new NetworkError(NetworkErrorType.AuthenticationFailed, "认证失败"),
            _ => new NetworkError(NetworkErrorType.Unknown, exception.Message)
        };
    }
}

public enum NetworkErrorType
{
    Unknown,
    ConnectionLost,
    Timeout,
    ServerError,
    AuthenticationFailed,
    ProtocolError,
    MessageFormatError
}

public struct NetworkError
{
    public NetworkErrorType type;
    public string message;
    public DateTime timestamp;
    
    public NetworkError(NetworkErrorType errorType, string errorMessage)
    {
        type = errorType;
        message = errorMessage;
        timestamp = DateTime.Now;
    }
}
```

### 性能优化

#### 消息压缩
```csharp
public static class MessageCompressor
{
    public static byte[] Compress(string message)
    {
        var bytes = Encoding.UTF8.GetBytes(message);
        
        using (var outputStream = new MemoryStream())
        using (var gzipStream = new GZipStream(outputStream, CompressionMode.Compress))
        {
            gzipStream.Write(bytes, 0, bytes.Length);
            gzipStream.Close();
            return outputStream.ToArray();
        }
    }
    
    public static string Decompress(byte[] compressedData)
    {
        using (var inputStream = new MemoryStream(compressedData))
        using (var gzipStream = new GZipStream(inputStream, CompressionMode.Decompress))
        using (var outputStream = new MemoryStream())
        {
            gzipStream.CopyTo(outputStream);
            return Encoding.UTF8.GetString(outputStream.ToArray());
        }
    }
}
```

#### 连接池管理
```csharp
public class ConnectionPool
{
    private readonly Queue<WebSocketClient> availableConnections = new Queue<WebSocketClient>();
    private readonly HashSet<WebSocketClient> activeConnections = new HashSet<WebSocketClient>();
    private readonly int maxPoolSize;
    
    public async Task<WebSocketClient> GetConnectionAsync()
    {
        if (availableConnections.Count > 0)
        {
            var connection = availableConnections.Dequeue();
            activeConnections.Add(connection);
            return connection;
        }
        
        if (activeConnections.Count < maxPoolSize)
        {
            var newConnection = new WebSocketClient();
            await newConnection.ConnectAsync(serverUri);
            activeConnections.Add(newConnection);
            return newConnection;
        }
        
        throw new InvalidOperationException("连接池已满");
    }
    
    public void ReturnConnection(WebSocketClient connection)
    {
        if (activeConnections.Remove(connection))
        {
            if (connection.State == WebSocketState.Open)
            {
                availableConnections.Enqueue(connection);
            }
            else
            {
                connection.Dispose();
            }
        }
    }
}
```

### 配置和调试

#### 网络配置
```csharp
[CreateAssetMenu(fileName = "NetworkConfig", menuName = "VRTranslate/Network Config")]
public class NetworkConfig : ScriptableObject
{
    [Header("连接设置")]
    public string serverHost = "localhost";
    public int serverPort = 8081;
    public bool useSSL = false;
    public float connectionTimeout = 10f;
    
    [Header("重连设置")]
    public int maxReconnectAttempts = 5;
    public float[] reconnectDelays = { 1f, 2f, 4f, 8f, 16f };
    
    [Header("消息设置")]
    public int maxQueueSize = 100;
    public float messageTimeout = 10f;
    public bool enableMessageCompression = true;
    
    [Header("心跳设置")]
    public float heartbeatInterval = 30f;
    public float heartbeatTimeout = 60f;
    
    [Header("调试设置")]
    public bool enableNetworkLogging = false;
    public bool showConnectionStatus = true;
}
```

## 开发优先级
1. **基础WebSocket连接** - 连接建立、消息发送接收
2. **消息协议实现** - 序列化、反序列化、消息类型
3. **连接管理** - 状态机、重连机制、错误处理
4. **性能优化** - 消息队列、压缩、连接池
5. **调试工具** - 网络状态显示、日志系统
6. **高级功能** - 心跳机制、消息确认、优先级

## 质量检查清单
- [ ] WebSocket连接稳定可靠
- [ ] 消息收发正确无误
- [ ] 断线重连机制正常
- [ ] 错误处理完整优雅
- [ ] 性能满足实时通信需求
- [ ] 网络状态可视化清晰
- [ ] 配置灵活易于调整
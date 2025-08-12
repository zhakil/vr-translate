using UnityEngine;
using System;
using System.Text;
using NativeWebSocket;
using VRTranslate.Network;

public class NetworkManager : MonoBehaviour
{
    public static NetworkManager Instance { get; private set; }

    [Header("Connection Settings")]
    public string serverUrl = "ws://localhost:8080";

    private WebSocket websocket;

    // --- Events for other managers to subscribe to ---
    public static event Action<TranslationResultPayload> OnTranslationReceived;
    public static event Action<StatusPayload> OnStatusUpdate;
    public static event Action<ErrorPayload> OnErrorReceived;
    public static event Action<ScreenshotRequestPayload> OnScreenshotRequested;
    public static event Action OnConnected;
    public static event Action OnDisconnected;

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
        }
        else
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
    }

    void Start()
    {
        Connect();
    }

    async void OnApplicationQuit()
    {
        if (websocket != null && websocket.State == WebSocketState.Open)
        {
            await websocket.Close();
        }
    }

    public async void Connect()
    {
        websocket = new WebSocket(serverUrl);

        websocket.OnOpen += () =>
        {
            Debug.Log("Connection open!");
            UnityMainThreadDispatcher.Instance().Enqueue(() => OnConnected?.Invoke());
        };

        websocket.OnError += (e) =>
        {
            Debug.LogError("Connection Error: " + e);
            UnityMainThreadDispatcher.Instance().Enqueue(() => OnErrorReceived?.Invoke(new ErrorPayload { message = e }));
        };

        websocket.OnClose += (e) =>
        {
            Debug.Log("Connection closed!");
            UnityMainThreadDispatcher.Instance().Enqueue(() => OnDisconnected?.Invoke());
        };

        websocket.OnMessage += (bytes) =>
        {
            var message = Encoding.UTF8.GetString(bytes);
            Debug.Log("Message received from server: " + message);
            ProcessMessage(message);
        };

        await websocket.Connect();
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        if (websocket != null && websocket.State == WebSocketState.Open)
        {
            websocket.DispatchMessageQueue();
        }
#endif
    }

    private void ProcessMessage(string json)
    {
        try
        {
            var baseMessage = JsonUtility.FromJson<WebSocketMessage<object>>(json);

            // Dispatch to the main thread to avoid issues with Unity API calls from other threads
            UnityMainThreadDispatcher.Instance().Enqueue(() => {
                switch (baseMessage.type)
                {
                    case "translation_result":
                        var data = JsonUtility.FromJson<WebSocketMessage<TranslationResultPayload>>(json);
                        OnTranslationReceived?.Invoke(data.payload);
                        break;
                    case "status":
                        var statusData = JsonUtility.FromJson<WebSocketMessage<StatusPayload>>(json);
                        OnStatusUpdate?.Invoke(statusData.payload);
                        break;
                    case "error":
                        var errorData = JsonUtility.FromJson<WebSocketMessage<ErrorPayload>>(json);
                        OnErrorReceived?.Invoke(errorData.payload);
                        break;
                    case "request_screenshot":
                        var requestData = JsonUtility.FromJson<WebSocketMessage<ScreenshotRequestPayload>>(json);
                        OnScreenshotRequested?.Invoke(requestData.payload);
                        break;
                    case "config_updated":
                        Debug.Log("Server confirmed config update.");
                        break;
                    default:
                        Debug.LogWarning("Unknown message type from server: " + baseMessage.type);
                        break;
                }
            });
        }
        catch (Exception e)
        {
            Debug.LogError("Failed to process server message: " + e.Message);
        }
    }

    public async void SendMessage<T>(string type, T payload)
    {
        if (websocket.State == WebSocketState.Open)
        {
            var message = new WebSocketMessage<T> { type = type, payload = payload };
            string json = JsonUtility.ToJson(message);
            Debug.Log("Sending message to server: " + json);
            await websocket.SendText(json);
        }
        else
        {
            Debug.LogError("Cannot send message, WebSocket is not open.");
        }
    }
}

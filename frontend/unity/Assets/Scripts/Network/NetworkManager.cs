using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Text;
using System.Collections;
using VRTranslate.Network;
using Newtonsoft.Json;

public class NetworkManager : MonoBehaviour
{
    public static NetworkManager Instance { get; private set; }

    [Header("Connection Settings")]
    public string serverUrl = "http://localhost:3000";
    public string websocketUrl = "ws://localhost:3001";

    private bool isConnected = false;

    // --- Events for other managers to subscribe to ---
    public static event Action<TranslationResultPayload> OnTranslationReceived;
    public static event Action<StatusPayload> OnStatusUpdate;
    public static event Action<ErrorPayload> OnErrorReceived;
    public static event Action OnConnected;
    public static event Action OnDisconnected;

    private void Awake()
    {
        // Singleton pattern
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void Start()
    {
        // Initialize connection
        StartCoroutine(ConnectToServer());
    }

    private IEnumerator ConnectToServer()
    {
        Debug.Log("Attempting to connect to server...");
        
        // Test HTTP connection first
        using (UnityWebRequest request = UnityWebRequest.Get(serverUrl + "/health"))
        {
            yield return request.SendWebRequest();
            
            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Successfully connected to server!");
                isConnected = true;
                OnConnected?.Invoke();
                OnStatusUpdate?.Invoke(new StatusPayload { message = "Connected to server" });
            }
            else
            {
                Debug.LogError($"Failed to connect to server: {request.error}");
                isConnected = false;
                OnDisconnected?.Invoke();
                OnErrorReceived?.Invoke(new ErrorPayload { message = "Failed to connect to server", errorCode = "CONNECTION_FAILED" });
            }
        }
    }

    public void SendGazeData(GazePayload gazeData)
    {
        if (!isConnected)
        {
            Debug.LogWarning("Not connected to server. Cannot send gaze data.");
            return;
        }

        StartCoroutine(SendGazeDataCoroutine(gazeData));
    }

    private IEnumerator SendGazeDataCoroutine(GazePayload gazeData)
    {
        string jsonData = JsonConvert.SerializeObject(gazeData);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);

        using (UnityWebRequest request = new UnityWebRequest(serverUrl + "/api/gaze", "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Gaze data sent successfully");
            }
            else
            {
                Debug.LogError($"Failed to send gaze data: {request.error}");
                OnErrorReceived?.Invoke(new ErrorPayload { message = "Failed to send gaze data", errorCode = "GAZE_SEND_FAILED" });
            }
        }
    }

    public void SendScreenshotData(ScreenshotPayload screenshotData)
    {
        if (!isConnected)
        {
            Debug.LogWarning("Not connected to server. Cannot send screenshot data.");
            return;
        }

        StartCoroutine(SendScreenshotDataCoroutine(screenshotData));
    }

    private IEnumerator SendScreenshotDataCoroutine(ScreenshotPayload screenshotData)
    {
        string jsonData = JsonConvert.SerializeObject(screenshotData);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);

        using (UnityWebRequest request = new UnityWebRequest(serverUrl + "/api/screenshot", "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                // Parse response for translation result
                string responseText = request.downloadHandler.text;
                try
                {
                    var translationResult = JsonConvert.DeserializeObject<TranslationResultPayload>(responseText);
                    OnTranslationReceived?.Invoke(translationResult);
                    Debug.Log("Translation received successfully");
                }
                catch (Exception e)
                {
                    Debug.LogError($"Failed to parse translation response: {e.Message}");
                }
            }
            else
            {
                Debug.LogError($"Failed to send screenshot data: {request.error}");
                OnErrorReceived?.Invoke(new ErrorPayload { message = "Failed to send screenshot data", errorCode = "SCREENSHOT_SEND_FAILED" });
            }
        }
    }

    public void SendConfigData(ConfigPayload configData)
    {
        if (!isConnected)
        {
            Debug.LogWarning("Not connected to server. Cannot send config data.");
            return;
        }

        StartCoroutine(SendConfigDataCoroutine(configData));
    }

    private IEnumerator SendConfigDataCoroutine(ConfigPayload configData)
    {
        string jsonData = JsonConvert.SerializeObject(configData);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonData);

        using (UnityWebRequest request = new UnityWebRequest(serverUrl + "/api/config", "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                Debug.Log("Config data sent successfully");
            }
            else
            {
                Debug.LogError($"Failed to send config data: {request.error}");
                OnErrorReceived?.Invoke(new ErrorPayload { message = "Failed to send config data", errorCode = "CONFIG_SEND_FAILED" });
            }
        }
    }

    public bool IsConnected()
    {
        return isConnected;
    }

    private void OnDestroy()
    {
        // Cleanup
        if (isConnected)
        {
            isConnected = false;
            OnDisconnected?.Invoke();
        }
    }
}
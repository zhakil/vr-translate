using UnityEngine;
using VRTranslate.Network;

/**
 * Complete integration example for Quest 3 head gaze tracking with translation.
 * This demonstrates how to set up and use all the head gaze components together.
 */
public class Quest3Integration : MonoBehaviour
{
    [Header("Component References")]
    [Tooltip("Quest 3 Head Gaze Manager")]
    public Quest3HeadGazeManager quest3HeadGaze;

    [Tooltip("Fallback Eye Tracking Manager")]
    public EyeTrackingManager eyeTrackingManager;

    [Tooltip("Network Manager for communication")]
    public NetworkManager networkManager;

    [Tooltip("Config Manager for settings")]
    public ConfigManager configManager;

    [Header("Gaze Indicator Settings")]
    [Tooltip("Prefab for gaze indicator")]
    public GameObject gazeIndicatorPrefab;

    [Tooltip("Create gaze indicator automatically if none provided")]
    public bool autoCreateGazeIndicator = true;

    [Header("Translation Settings")]
    [Tooltip("Automatically trigger translation on gaze fixation")]
    public bool autoTranslateOnGaze = true;

    [Tooltip("Minimum gaze confidence for translation trigger")]
    [Range(0f, 1f)]
    public float minGazeConfidence = 0.8f;

    private GazeIndicator gazeIndicator;
    private bool isInitialized = false;

    void Start()
    {
        InitializeQuest3Integration();
    }

    void Update()
    {
        if (isInitialized)
        {
            UpdateGazeIndicator();
            CheckTranslationTrigger();
        }
    }

    private void InitializeQuest3Integration()
    {
        Debug.Log("Initializing Quest 3 Integration...");

        // Find components if not assigned
        FindComponents();

        // Setup gaze indicator
        SetupGazeIndicator();

        // Configure network events
        SetupNetworkEvents();

        // Apply initial configuration
        ApplyConfiguration();

        isInitialized = true;
        Debug.Log("Quest 3 Integration initialized successfully!");
    }

    private void FindComponents()
    {
        // Find Quest3HeadGazeManager
        if (quest3HeadGaze == null)
        {
            quest3HeadGaze = FindObjectOfType<Quest3HeadGazeManager>();
        }

        // Find EyeTrackingManager
        if (eyeTrackingManager == null)
        {
            eyeTrackingManager = FindObjectOfType<EyeTrackingManager>();
        }

        // Find NetworkManager
        if (networkManager == null)
        {
            networkManager = NetworkManager.Instance;
        }

        // Find ConfigManager
        if (configManager == null)
        {
            configManager = FindObjectOfType<ConfigManager>();
        }

        Debug.Log($"Components found - Quest3: {quest3HeadGaze != null}, " +
                 $"EyeTracking: {eyeTrackingManager != null}, " +
                 $"Network: {networkManager != null}, " +
                 $"Config: {configManager != null}");
    }

    private void SetupGazeIndicator()
    {
        if (gazeIndicatorPrefab != null)
        {
            GameObject indicatorObj = Instantiate(gazeIndicatorPrefab);
            gazeIndicator = indicatorObj.GetComponent<GazeIndicator>();
        }
        else if (autoCreateGazeIndicator)
        {
            GameObject indicatorObj = GazeIndicator.CreateSimpleGazeIndicator();
            gazeIndicator = indicatorObj.GetComponent<GazeIndicator>();
        }

        if (gazeIndicator != null)
        {
            Debug.Log("Gaze indicator setup complete");
        }
    }

    private void SetupNetworkEvents()
    {
        if (networkManager != null)
        {
            // Subscribe to network events
            NetworkManager.OnConnectionStatusChanged += OnNetworkStatusChanged;
            Debug.Log("Network events configured");
        }
    }

    private void ApplyConfiguration()
    {
        if (configManager != null)
        {
            // Apply language settings and other configuration
            string targetLanguage = configManager.TargetLanguage;
            Debug.Log($"Target language set to: {targetLanguage}");
        }

        // Configure Quest 3 head gaze if available
        if (quest3HeadGaze != null)
        {
            quest3HeadGaze.SetHeadGazeTracking(true);
            
            // Optimize settings for translation use case
            quest3HeadGaze.sendInterval = 0.1f; // 10Hz for responsive translation
            quest3HeadGaze.minTrackingConfidence = minGazeConfidence;
        }

        // Configure fallback eye tracking
        if (eyeTrackingManager != null)
        {
            eyeTrackingManager.SetTracking(true);
            eyeTrackingManager.useHeadGazeInVR = true;
        }
    }

    private void UpdateGazeIndicator()
    {
        if (gazeIndicator == null) return;

        Vector3 gazeWorldPos;
        float confidence = 0f;
        bool isTracking = false;

        // Get gaze data from Quest 3 manager if available
        if (quest3HeadGaze != null && quest3HeadGaze.IsTrackingValid())
        {
            gazeWorldPos = quest3HeadGaze.GetCurrentGazeWorldPosition();
            confidence = quest3HeadGaze.GetTrackingConfidence();
            isTracking = true;
        }
        // Fallback to eye tracking manager
        else if (eyeTrackingManager != null)
        {
            Vector2 screenPos = eyeTrackingManager.GetCurrentGazePosition();
            
            // Convert screen to world position (simplified)
            Camera cam = Camera.main;
            if (cam != null)
            {
                Vector3 screenPoint = new Vector3(screenPos.x, screenPos.y, 5f);
                gazeWorldPos = cam.ScreenToWorldPoint(screenPoint);
                confidence = 0.5f; // Default confidence for fallback
                isTracking = true;
            }
            else
            {
                gazeWorldPos = Vector3.zero;
            }
        }
        else
        {
            gazeWorldPos = Vector3.zero;
        }

        // Update indicator position and state
        if (isTracking && confidence >= minGazeConfidence)
        {
            gazeIndicator.transform.position = gazeWorldPos;
            gazeIndicator.OnGazeStay(confidence);
        }
        else
        {
            gazeIndicator.OnGazeExit();
        }
    }

    private void CheckTranslationTrigger()
    {
        if (!autoTranslateOnGaze) return;

        // This would typically be triggered by the backend gaze analyzer
        // but we can also implement client-side triggering for immediate feedback
        
        if (quest3HeadGaze != null && quest3HeadGaze.IsTrackingValid())
        {
            float confidence = quest3HeadGaze.GetTrackingConfidence();
            
            if (confidence >= minGazeConfidence)
            {
                // Potential translation trigger point
                // The actual translation is triggered by the backend gaze analyzer
                Debug.Log($"High confidence gaze detected: {confidence:F2}");
            }
        }
    }

    private void OnNetworkStatusChanged(bool isConnected)
    {
        Debug.Log($"Network status changed: {(isConnected ? "Connected" : "Disconnected")}");
        
        if (isConnected)
        {
            // Send initial configuration to backend
            SendHeadGazeConfiguration();
        }
    }

    private void SendHeadGazeConfiguration()
    {
        if (networkManager == null) return;

        // Send configuration to backend to enable head gaze mode
        var config = new
        {
            headGazeMode = true,
            headGazeStabilityThreshold = 80,
            headGazeTimeThreshold = 1500,
            deviceType = "Quest 3"
        };

        // This would be sent via WebSocket to configure the backend GazeAnalyzer
        Debug.Log("Sending head gaze configuration to backend");
        
        // Example: networkManager.SendMessage("configure_gaze", config);
    }

    // Public API methods
    public void EnableHeadGazeTracking(bool enable)
    {
        if (quest3HeadGaze != null)
        {
            quest3HeadGaze.SetHeadGazeTracking(enable);
        }

        if (eyeTrackingManager != null)
        {
            eyeTrackingManager.SetTracking(enable);
        }

        Debug.Log($"Head gaze tracking {(enable ? "enabled" : "disabled")}");
    }

    public void SetGazeConfidenceThreshold(float threshold)
    {
        minGazeConfidence = Mathf.Clamp01(threshold);
        
        if (quest3HeadGaze != null)
        {
            quest3HeadGaze.minTrackingConfidence = minGazeConfidence;
        }

        Debug.Log($"Gaze confidence threshold set to: {minGazeConfidence:F2}");
    }

    public bool IsHeadGazeActive()
    {
        if (quest3HeadGaze != null)
        {
            return quest3HeadGaze.IsTrackingValid();
        }
        
        if (eyeTrackingManager != null)
        {
            return eyeTrackingManager.IsUsingHeadGaze();
        }

        return false;
    }

    public Vector3 GetCurrentGazeWorldPosition()
    {
        if (quest3HeadGaze != null && quest3HeadGaze.IsTrackingValid())
        {
            return quest3HeadGaze.GetCurrentGazeWorldPosition();
        }

        return Vector3.zero;
    }

    public Vector2 GetCurrentGazeScreenPosition()
    {
        if (quest3HeadGaze != null && quest3HeadGaze.IsTrackingValid())
        {
            return quest3HeadGaze.GetCurrentGazeScreenPosition();
        }

        if (eyeTrackingManager != null)
        {
            return eyeTrackingManager.GetCurrentGazePosition();
        }

        return Vector2.zero;
    }

    void OnDestroy()
    {
        // Cleanup
        if (networkManager != null)
        {
            NetworkManager.OnConnectionStatusChanged -= OnNetworkStatusChanged;
        }
    }
}
using UnityEngine;
using UnityEngine.XR;
using System.Collections.Generic;
using VRTranslate.Network;

#if OCULUS_SDK
using Oculus.Interaction;
#endif

/**
 * Specialized head gaze manager optimized for Quest 3.
 * Uses Meta XR SDK features specific to Quest 3 for improved head tracking accuracy.
 */
public class Quest3HeadGazeManager : MonoBehaviour
{
    [Header("Quest 3 Head Gaze Settings")]
    [Tooltip("Enable or disable Quest 3 head gaze tracking.")]
    public bool isHeadGazeEnabled = true;

    [Tooltip("How often to send head gaze data to the server, in seconds.")]
    public float sendInterval = 0.1f;

    [Tooltip("Distance for gaze ray projection (optimized for Quest 3).")]
    public float gazeRayDistance = 8f;

    [Tooltip("Smoothing factor for head movement (0 = no smoothing, 1 = max smoothing).")]
    [Range(0f, 1f)]
    public float headSmoothingFactor = 0.3f;

    [Header("Quest 3 Specific Settings")]
    [Tooltip("Use Quest 3 hand tracking for additional context.")]
    public bool useHandTrackingContext = true;

    [Tooltip("Minimum confidence level for head tracking data.")]
    [Range(0f, 1f)]
    public float minTrackingConfidence = 0.8f;

    [Header("Gaze Filtering")]
    [Tooltip("Layer mask for UI elements that can be gazed at.")]
    public LayerMask uiGazeLayers = 1 << 5; // UI layer

    [Tooltip("Layer mask for world objects that can be gazed at.")]
    public LayerMask worldGazeLayers = -1;

    [Header("Visual Feedback")]
    [Tooltip("Show visual indicator where user is looking.")]
    public bool showGazeIndicator = true;

    [Tooltip("Prefab for gaze indicator (optional).")]
    public GameObject gazeIndicatorPrefab;

    private Camera headCamera;
    private InputDevice headDevice;
    private float lastSendTime;
    private Vector3 smoothedHeadPosition;
    private Quaternion smoothedHeadRotation;
    private Vector2 currentGazeScreenPosition;
    private Vector3 currentGazeWorldPosition;
    private GameObject gazeIndicatorInstance;
    private bool isTrackingValid = false;

    // Quest 3 specific tracking
    private float trackingConfidence = 0f;
    private Vector3 previousHeadPosition;
    private Quaternion previousHeadRotation;

    void Start()
    {
        InitializeQuest3Tracking();
        CreateGazeIndicator();
    }

    void Update()
    {
        if (isHeadGazeEnabled)
        {
            UpdateQuest3HeadTracking();
            
            if (Time.time - lastSendTime > sendInterval && isTrackingValid)
            {
                SendHeadGazeData();
                lastSendTime = Time.time;
            }
        }
    }

    private void InitializeQuest3Tracking()
    {
        // Get the main camera (Quest 3 center eye)
        headCamera = Camera.main;
        if (headCamera == null)
        {
            headCamera = FindObjectOfType<Camera>();
        }

        if (headCamera == null)
        {
            Debug.LogError("Quest3HeadGazeManager: No camera found!");
            return;
        }

        // Initialize head tracking device
        var headDevices = new List<InputDevice>();
        InputDevices.GetDevicesAtXRNode(XRNode.Head, headDevices);

        if (headDevices.Count > 0)
        {
            headDevice = headDevices[0];
            Debug.Log($"Quest3HeadGazeManager: Head device found: {headDevice.name}");
            
            // Initialize smoothed values
            if (headDevice.TryGetFeatureValue(CommonUsages.devicePosition, out Vector3 pos) &&
                headDevice.TryGetFeatureValue(CommonUsages.deviceRotation, out Quaternion rot))
            {
                smoothedHeadPosition = pos;
                smoothedHeadRotation = rot;
                previousHeadPosition = pos;
                previousHeadRotation = rot;
            }
        }
        else
        {
            Debug.LogWarning("Quest3HeadGazeManager: No head device found");
        }
    }

    private void UpdateQuest3HeadTracking()
    {
        if (headDevice.isValid && headCamera != null)
        {
            Vector3 headPosition;
            Quaternion headRotation;
            bool trackingValid = false;

            // Get raw tracking data
            if (headDevice.TryGetFeatureValue(CommonUsages.devicePosition, out headPosition) &&
                headDevice.TryGetFeatureValue(CommonUsages.deviceRotation, out headRotation))
            {
                // Calculate tracking confidence based on movement stability
                trackingConfidence = CalculateTrackingConfidence(headPosition, headRotation);
                trackingValid = trackingConfidence >= minTrackingConfidence;

                if (trackingValid)
                {
                    // Apply smoothing for more stable gaze
                    smoothedHeadPosition = Vector3.Lerp(smoothedHeadPosition, headPosition, 1f - headSmoothingFactor);
                    smoothedHeadRotation = Quaternion.Lerp(smoothedHeadRotation, headRotation, 1f - headSmoothingFactor);

                    // Update gaze calculation
                    CalculateGazePosition();
                    
                    // Update visual indicator
                    UpdateGazeIndicator();
                }

                // Store for next frame comparison
                previousHeadPosition = headPosition;
                previousHeadRotation = headRotation;
            }

            isTrackingValid = trackingValid;
        }
        else
        {
            // Fallback to camera transform
            smoothedHeadPosition = headCamera.transform.position;
            smoothedHeadRotation = headCamera.transform.rotation;
            CalculateGazePosition();
            UpdateGazeIndicator();
            isTrackingValid = true;
        }
    }

    private float CalculateTrackingConfidence(Vector3 currentPos, Quaternion currentRot)
    {
        // Calculate movement delta
        float positionDelta = Vector3.Distance(currentPos, previousHeadPosition);
        float rotationDelta = Quaternion.Angle(currentRot, previousHeadRotation);

        // Confidence decreases with rapid movement (potential tracking instability)
        float movementFactor = Mathf.Clamp01(1f - (positionDelta * 10f + rotationDelta * 0.1f));
        
        // Additional factors can be added here (e.g., lighting conditions, etc.)
        return movementFactor;
    }

    private void CalculateGazePosition()
    {
        Vector3 gazeDirection = smoothedHeadRotation * Vector3.forward;
        Vector3 gazeOrigin = smoothedHeadPosition;

        // Raycast for UI elements first (higher priority)
        RaycastHit hit;
        bool hitFound = false;

        // Check UI layer first
        if (Physics.Raycast(gazeOrigin, gazeDirection, out hit, gazeRayDistance, uiGazeLayers))
        {
            currentGazeWorldPosition = hit.point;
            hitFound = true;
        }
        // Then check world objects
        else if (Physics.Raycast(gazeOrigin, gazeDirection, out hit, gazeRayDistance, worldGazeLayers))
        {
            currentGazeWorldPosition = hit.point;
            hitFound = true;
        }

        // If no hit, project forward
        if (!hitFound)
        {
            currentGazeWorldPosition = gazeOrigin + gazeDirection * gazeRayDistance;
        }

        // Convert to screen coordinates
        Vector3 screenPos = headCamera.WorldToScreenPoint(currentGazeWorldPosition);
        currentGazeScreenPosition = new Vector2(screenPos.x, screenPos.y);
    }

    private void SendHeadGazeData()
    {
        if (NetworkManager.Instance != null)
        {
            GazePayload payload = new GazePayload
            {
                x = currentGazeScreenPosition.x,
                y = currentGazeScreenPosition.y
            };

            NetworkManager.Instance.SendMessage("gaze", payload);
        }
    }

    private void CreateGazeIndicator()
    {
        if (showGazeIndicator && gazeIndicatorPrefab != null)
        {
            gazeIndicatorInstance = Instantiate(gazeIndicatorPrefab);
            gazeIndicatorInstance.name = "Quest3_GazeIndicator";
        }
    }

    private void UpdateGazeIndicator()
    {
        if (gazeIndicatorInstance != null && showGazeIndicator)
        {
            gazeIndicatorInstance.transform.position = currentGazeWorldPosition;
            gazeIndicatorInstance.SetActive(isTrackingValid);
        }
    }

    // Public API
    public void SetHeadGazeTracking(bool enabled)
    {
        isHeadGazeEnabled = enabled;
        
        if (gazeIndicatorInstance != null)
        {
            gazeIndicatorInstance.SetActive(enabled && showGazeIndicator);
        }
    }

    public Vector2 GetCurrentGazeScreenPosition()
    {
        return currentGazeScreenPosition;
    }

    public Vector3 GetCurrentGazeWorldPosition()
    {
        return currentGazeWorldPosition;
    }

    public float GetTrackingConfidence()
    {
        return trackingConfidence;
    }

    public bool IsTrackingValid()
    {
        return isTrackingValid;
    }

    // Device management
    void OnDeviceChange(InputDevice device, InputDeviceChangeType changeType)
    {
        if (changeType == InputDeviceChangeType.DeviceAdded && 
            device.characteristics.HasFlag(InputDeviceCharacteristics.HeadMounted))
        {
            headDevice = device;
            Debug.Log($"Quest3HeadGazeManager: New head device connected: {device.name}");
        }
    }

    void OnEnable()
    {
        InputDevices.deviceConnected += OnDeviceChange;
        InputDevices.deviceDisconnected += OnDeviceChange;
    }

    void OnDisable()
    {
        InputDevices.deviceConnected -= OnDeviceChange;
        InputDevices.deviceDisconnected -= OnDeviceChange;
    }

    void OnDestroy()
    {
        if (gazeIndicatorInstance != null)
        {
            Destroy(gazeIndicatorInstance);
        }
    }

    // Debug visualization
    void OnDrawGizmos()
    {
        if (isHeadGazeEnabled && Application.isPlaying && isTrackingValid)
        {
            // Draw gaze ray
            Gizmos.color = Color.green;
            Vector3 direction = smoothedHeadRotation * Vector3.forward;
            Gizmos.DrawRay(smoothedHeadPosition, direction * gazeRayDistance);
            
            // Draw gaze point
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(currentGazeWorldPosition, 0.05f);
            
            // Draw confidence indicator
            Gizmos.color = Color.Lerp(Color.red, Color.green, trackingConfidence);
            Gizmos.DrawWireCube(smoothedHeadPosition + Vector3.up * 0.2f, Vector3.one * 0.1f * trackingConfidence);
        }
    }
}
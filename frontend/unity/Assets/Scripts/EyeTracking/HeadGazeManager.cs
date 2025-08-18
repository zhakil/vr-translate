using UnityEngine;
using System.Collections.Generic;
using VRTranslate.Network;

/**
 * Manages head-based gaze tracking for Quest 3 and other VR headsets.
 * Uses head orientation and position to simulate gaze data for text translation.
 */
public class HeadGazeManager : MonoBehaviour
{
    [Header("Head Gaze Settings")]
    [Tooltip("Enable or disable head gaze tracking.")]
    public bool isHeadGazeEnabled = true;

    [Tooltip("How often to send head gaze data to the server, in seconds.")]
    public float sendInterval = 0.1f; // Send data 10 times per second

    [Tooltip("Distance from head position for gaze ray projection.")]
    public float gazeRayDistance = 10f;

    [Tooltip("Layer mask for objects that can be gazed at.")]
    public LayerMask gazeLayers = -1;

    [Header("Gaze Visualization")]
    [Tooltip("Show gaze ray in scene view for debugging.")]
    public bool showGazeRay = true;

    [Tooltip("Color of the gaze ray visualization.")]
    public Color gazeRayColor = Color.red;

    private Camera headCamera;
    private float lastSendTime;
    private Vector3 lastGazeWorldPosition;
    private Vector2 lastGazeScreenPosition;

    void Start()
    {
        InitializeHeadTracking();
    }

    void Update()
    {
        if (isHeadGazeEnabled && Time.time - lastSendTime > sendInterval)
        {
            UpdateHeadGaze();
            lastSendTime = Time.time;
        }
    }

    private void InitializeHeadTracking()
    {
        // Get the main camera (should be the VR head camera)
        headCamera = Camera.main;
        if (headCamera == null)
        {
            headCamera = FindFirstObjectByType<Camera>();
        }

        if (headCamera == null)
        {
            Debug.LogError("HeadGazeManager: No camera found for head tracking!");
            return;
        }

        Debug.Log("HeadGazeManager: Using camera transform for head tracking (XR packages not loaded)");
    }

    private void UpdateHeadGaze()
    {
        if (headCamera == null) return;

        // Use camera transform (fallback method when XR packages not available)
        Vector3 headPosition = headCamera.transform.position;
        Quaternion headRotation = headCamera.transform.rotation;

        // Calculate gaze direction (forward from head)
        Vector3 gazeDirection = headRotation * Vector3.forward;
        
        // Project gaze ray to find intersection point
        Vector3 gazeWorldPosition = headPosition + gazeDirection * gazeRayDistance;
        
        // Perform raycast to find objects in gaze direction
        RaycastHit hit;
        if (Physics.Raycast(headPosition, gazeDirection, out hit, gazeRayDistance, gazeLayers))
        {
            gazeWorldPosition = hit.point;
        }

        // Convert world position to screen coordinates
        Vector3 screenPos = headCamera.WorldToScreenPoint(gazeWorldPosition);
        Vector2 gazeScreenPosition = new Vector2(screenPos.x, screenPos.y);

        // Store for visualization
        lastGazeWorldPosition = gazeWorldPosition;
        lastGazeScreenPosition = gazeScreenPosition;

        // Send gaze data to server
        SendHeadGazeData(gazeScreenPosition);

        // Draw debug ray
        if (showGazeRay)
        {
            Debug.DrawRay(headPosition, gazeDirection * gazeRayDistance, gazeRayColor);
        }
    }

    private void SendHeadGazeData(Vector2 screenPosition)
    {
        if (NetworkManager.Instance != null)
        {
            GazePayload payload = new GazePayload
            {
                x = screenPosition.x,
                y = screenPosition.y
            };

            NetworkManager.Instance.SendGazeData(payload);
        }
    }

    public void SetHeadGazeTracking(bool enabled)
    {
        isHeadGazeEnabled = enabled;
    }

    public Vector2 GetCurrentGazeScreenPosition()
    {
        return lastGazeScreenPosition;
    }

    public Vector3 GetCurrentGazeWorldPosition()
    {
        return lastGazeWorldPosition;
    }

    void OnEnable()
    {
        // Device change handling will be added when XR packages are available
    }

    void OnDisable()
    {
        // Device cleanup will be added when XR packages are available
    }

    // Debug visualization
    void OnDrawGizmos()
    {
        if (showGazeRay && headCamera != null && isHeadGazeEnabled)
        {
            Gizmos.color = gazeRayColor;
            Vector3 startPos = headCamera.transform.position;
            Vector3 direction = headCamera.transform.forward;
            Gizmos.DrawRay(startPos, direction * gazeRayDistance);
            
            // Draw sphere at gaze point
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(lastGazeWorldPosition, 0.1f);
        }
    }
}
using UnityEngine;
using VRTranslate.Network;

/**
 * Manages eye tracking data with fallback support.
 * This acts as a fallback when HeadGazeManager is not available or in non-VR mode.
 * Uses mouse position as a substitute for gaze data in desktop mode.
 */
public class EyeTrackingManager : MonoBehaviour
{
    [Header("Settings")]
    [Tooltip("Enable or disable sending of gaze data.")]
    public bool isTrackingEnabled = true;

    [Tooltip("How often to send gaze data to the server, in seconds.")]
    public float sendInterval = 0.1f; // Send data 10 times per second

    [Header("VR Integration")]
    [Tooltip("Reference to HeadGazeManager for VR mode.")]
    public HeadGazeManager headGazeManager;

    [Tooltip("Automatically use HeadGazeManager if available in VR.")]
    public bool useHeadGazeInVR = true;

    private float lastSendTime;
    private bool isVRMode = false;

    void Start()
    {
        // Check if we're in VR mode (fallback method when XR packages not available)
        isVRMode = false; // Will be enabled when XR packages are added
        
        // Try to find HeadGazeManager if not assigned
        if (headGazeManager == null)
        {
            headGazeManager = FindFirstObjectByType<HeadGazeManager>();
        }

        Debug.Log($"EyeTrackingManager: VR Mode = {isVRMode}, HeadGaze Available = {headGazeManager != null}");
    }

    void Update()
    {
        if (isTrackingEnabled && Time.time - lastSendTime > sendInterval)
        {
            SendGazeData();
            lastSendTime = Time.time;
        }
    }

    private void SendGazeData()
    {
        if (NetworkManager.Instance == null) return;

        Vector2 gazePosition;

        // Use HeadGazeManager in VR mode if available and enabled
        if (isVRMode && useHeadGazeInVR && headGazeManager != null && headGazeManager.isHeadGazeEnabled)
        {
            gazePosition = headGazeManager.GetCurrentGazeScreenPosition();
        }
        else
        {
            // Fallback to mouse position for desktop mode
            gazePosition = Input.mousePosition;
        }

        GazePayload payload = new GazePayload
        {
            x = gazePosition.x,
            y = gazePosition.y
        };

        NetworkManager.Instance.SendGazeData(payload);
    }

    public void SetTracking(bool enabled)
    {
        isTrackingEnabled = enabled;
    }

    public Vector2 GetCurrentGazePosition()
    {
        if (isVRMode && useHeadGazeInVR && headGazeManager != null)
        {
            return headGazeManager.GetCurrentGazeScreenPosition();
        }
        else
        {
            return Input.mousePosition;
        }
    }

    public bool IsUsingHeadGaze()
    {
        return isVRMode && useHeadGazeInVR && headGazeManager != null && headGazeManager.isHeadGazeEnabled;
    }
}

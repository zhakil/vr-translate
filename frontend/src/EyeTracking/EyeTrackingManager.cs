using UnityEngine;
using VRTranslate.Network;

/**
 * Manages eye tracking data.
 * In a real application, this would interface with an eye tracking SDK (e.g., Tobii, SRanipal).
 * For this project, it simulates gaze data using the mouse position.
 */
public class EyeTrackingManager : MonoBehaviour
{
    [Header("Settings")]
    [Tooltip("Enable or disable sending of gaze data.")]
    public bool isTrackingEnabled = true;

    [Tooltip("How often to send gaze data to the server, in seconds.")]
    public float sendInterval = 0.1f; // Send data 10 times per second

    private float lastSendTime;

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
        if (NetworkManager.Instance != null)
        {
            // Use mouse position as a substitute for gaze data
            Vector2 mousePosition = Input.mousePosition;

            GazePayload payload = new GazePayload
            {
                x = mousePosition.x,
                y = mousePosition.y
            };

            NetworkManager.Instance.SendMessage("gaze", payload);
        }
    }

    public void SetTracking(bool enabled)
    {
        isTrackingEnabled = enabled;
    }
}

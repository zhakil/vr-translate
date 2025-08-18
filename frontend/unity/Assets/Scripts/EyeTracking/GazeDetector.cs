using UnityEngine;
using System.Collections;
using VRTranslate.Network;
using System;

/**
 * Detects when a screenshot is requested by the server and captures the screen.
 */
public class GazeDetector : MonoBehaviour
{
    // Dependencies - can be linked in the Unity Editor
    public ConfigManager configManager;

    void Awake()
    {
        // Automatically find the ConfigManager if it hasn't been assigned in the Editor
        if (configManager == null)
        {
            configManager = GetComponent<ConfigManager>();
        }
    }

    void OnEnable()
    {
        // Screenshot requests will be handled differently when server integration is restored
    }

    void OnDisable()
    {
        // Cleanup will be added when server integration is restored
    }

    public void RequestScreenshot(float x = 0, float y = 0)
    {
        Debug.Log($"Screenshot requested at ({x}, {y}). Capturing screen.");
        StartCoroutine(CaptureAndSendScreenshot());
    }

    private IEnumerator CaptureAndSendScreenshot()
    {
        // Wait for the end of the frame to ensure all rendering is complete
        yield return new WaitForEndOfFrame();

        // Capture the screen
        Texture2D screenTexture = new Texture2D(Screen.width, Screen.height, TextureFormat.RGB24, false);
        screenTexture.ReadPixels(new Rect(0, 0, Screen.width, Screen.height), 0, 0);
        screenTexture.Apply();

        // Encode to JPG to reduce size, then to Base64
        byte[] imageBytes = screenTexture.EncodeToJPG();
        string base64Image = Convert.ToBase64String(imageBytes);

        // Clean up the texture
        Destroy(screenTexture);

        // Get language settings from ConfigManager
        string sourceLang = "en"; // Or get from config
        string targetLang = configManager != null ? configManager.TargetLanguage : "zh"; // Default to Chinese

        // Create payload and send
        ScreenshotPayload payload = new ScreenshotPayload
        {
            image = base64Image,
            sourceLang = sourceLang,
            targetLang = targetLang
        };

        NetworkManager.Instance.SendScreenshotData(payload);
        Debug.Log("Screenshot sent to server.");
    }
}

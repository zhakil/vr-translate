using UnityEngine;
using VRTranslate.Network;

/**
 * Manages the application's configuration settings on the frontend.
 * It holds the state and sends updates to the backend via the NetworkManager.
 */
public class ConfigManager : MonoBehaviour
{
    public static ConfigManager Instance { get; private set; }

    [Header("Translation Settings")]
    public string TranslationEngine = "mock"; // Default to mock
    public string TargetLanguage = "zh"; // Default to Chinese
    public string DeepLApiKey = ""; // DeepL API Key

    [Header("Gaze Settings")]
    public float GazeTimeThreshold = 1000f; // in milliseconds
    public float GazeStabilityThreshold = 50f; // in pixels

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

    // --- Public methods for UI or other managers to call ---

    public void SetTargetLanguage(string newLanguage)
    {
        TargetLanguage = newLanguage;
        SendTranslationConfig();
    }

    public void SetTranslationEngine(string newEngine)
    {
        TranslationEngine = newEngine;
        SendTranslationConfig();
    }

    public void SetDeepLApiKey(string newApiKey)
    {
        DeepLApiKey = newApiKey;
        SendTranslationConfig();
    }

    public void SetGazeTimeThreshold(float milliseconds)
    {
        GazeTimeThreshold = milliseconds;
        SendGazeConfig();
    }

    public void SetGazeStabilityThreshold(float pixels)
    {
        GazeStabilityThreshold = pixels;
        SendGazeConfig();
    }

    // --- Private methods to send updates to the server ---

    private void SendTranslationConfig()
    {
        if (NetworkManager.Instance == null) return;

        var payload = new ConfigPayload
        {
            translation = new TranslationConfig
            {
                engine = this.TranslationEngine,
                targetLang = this.TargetLanguage,
                deepl = new DeepLConfig { apiKey = this.DeepLApiKey }
            }
        };
        NetworkManager.Instance.SendConfigData(payload);
    }

    private void SendGazeConfig()
    {
        if (NetworkManager.Instance == null) return;

        var payload = new ConfigPayload
        {
            gaze = new GazeConfig
            {
                timeThreshold = this.GazeTimeThreshold,
                stabilityThreshold = this.GazeStabilityThreshold
            }
        };
        NetworkManager.Instance.SendConfigData(payload);
    }

    public void SendFullConfig()
    {
        if (NetworkManager.Instance == null) return;

        var payload = new ConfigPayload
        {
            translation = new TranslationConfig
            {
                engine = this.TranslationEngine,
                targetLang = this.TargetLanguage,
                deepl = new DeepLConfig { apiKey = this.DeepLApiKey }
            },
            gaze = new GazeConfig
            {
                timeThreshold = this.GazeTimeThreshold,
                stabilityThreshold = this.GazeStabilityThreshold
            }
        };
        NetworkManager.Instance.SendConfigData(payload);
    }
}

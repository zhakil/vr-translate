using UnityEngine;
using UnityEngine.UI;
using VRTranslate.Network;
using TMPro; // Using TextMeshPro for better text rendering

/**
 * Manages all UI elements and user interactions.
 */
public class UIManager : MonoBehaviour
{
    [Header("Dependencies")]
    public ConfigManager configManager;

    [Header("Display Elements")]
    public TextMeshProUGUI translationText;
    public TextMeshProUGUI originalText;
    public TextMeshProUGUI statusText;
    public TextMeshProUGUI connectionStatusText;

    [Header("Configuration Inputs")]
    public TMP_InputField targetLanguageInput;
    public Slider gazeTimeSlider;
    public TextMeshProUGUI gazeTimeValueText;
    public Slider gazeStabilitySlider;
    public TextMeshProUGUI gazeStabilityValueText;

    void OnEnable()
    {
        // Listen to events from other managers
        TranslationManager.OnTranslationReady += UpdateTranslationUI;
        NetworkManager.OnStatusUpdate += UpdateStatusUI;
        NetworkManager.OnErrorReceived += UpdateErrorUI;
        NetworkManager.OnConnected += HandleConnected;
        NetworkManager.OnDisconnected += HandleDisconnected;
    }

    void OnDisable()
    {
        // Clean up listeners
        TranslationManager.OnTranslationReady -= UpdateTranslationUI;
        NetworkManager.OnStatusUpdate -= UpdateStatusUI;
        NetworkManager.OnErrorReceived -= UpdateErrorUI;
        NetworkManager.OnConnected -= HandleConnected;
        NetworkManager.OnDisconnected -= HandleDisconnected;
    }

    void Start()
    {
        // Initialize UI with values from ConfigManager
        InitializeConfigUI();
        // Add listeners for UI controls
        AddUIControlListeners();
    }

    private void InitializeConfigUI()
    {
        if (configManager == null) return;

        targetLanguageInput.text = configManager.TargetLanguage;

        gazeTimeSlider.value = configManager.GazeTimeThreshold;
        gazeTimeValueText.text = $"{configManager.GazeTimeThreshold:F0} ms";

        gazeStabilitySlider.value = configManager.GazeStabilityThreshold;
        gazeStabilityValueText.text = $"{configManager.GazeStabilityThreshold:F0} px";
    }

    private void AddUIControlListeners()
    {
        targetLanguageInput.onEndEdit.AddListener(configManager.SetTargetLanguage);

        gazeTimeSlider.onValueChanged.AddListener((value) => {
            gazeTimeValueText.text = $"{value:F0} ms";
            configManager.SetGazeTimeThreshold(value);
        });

        gazeStabilitySlider.onValueChanged.AddListener((value) => {
            gazeStabilityValueText.text = $"{value:F0} px";
            configManager.SetGazeStabilityThreshold(value);
        });
    }

    private void UpdateTranslationUI(TranslationResultPayload payload)
    {
        if (translationText != null) translationText.text = payload.translation;
        if (originalText != null) originalText.text = $"Original: {payload.original}";
        if (statusText != null) statusText.text = "Translation complete.";
    }

    private void UpdateStatusUI(StatusPayload payload)
    {
        if (statusText != null) statusText.text = payload.message;
    }

    private void UpdateErrorUI(ErrorPayload payload)
    {
        if (statusText != null) statusText.text = $"<color=red>Error: {payload.message}</color>";
    }

    private void HandleConnected()
    {
        if (connectionStatusText != null) connectionStatusText.text = "<color=green>Connected</color>";
        // When connected, send the initial full config to the server
        configManager?.SendFullConfig();
    }

    private void HandleDisconnected()
    {
        if (connectionStatusText != null) connectionStatusText.text = "<color=red>Disconnected</color>";
    }
}

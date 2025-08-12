using UnityEngine;
using VRTranslate.Network;
using System;

/**
 * Manages the lifecycle of a translation result.
 * It receives data from the NetworkManager and makes it available to the UI.
 */
public class TranslationManager : MonoBehaviour
{
    public static event Action<TranslationResultPayload> OnTranslationReady;

    void OnEnable()
    {
        NetworkManager.OnTranslationReceived += HandleTranslationReceived;
    }

    void OnDisable()
    {
        NetworkManager.OnTranslationReceived -= HandleTranslationReceived;
    }

    private void HandleTranslationReceived(TranslationResultPayload payload)
    {
        Debug.Log($"Translation ready: '{payload.original}' -> '{payload.translation}'");
        // Fire event for the UI to pick up
        OnTranslationReady?.Invoke(payload);
    }
}

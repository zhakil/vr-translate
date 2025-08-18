using System;

namespace VRTranslate.Network
{
    // C# classes that represent the JSON structure for WebSocket communication.
    // These are used with a JSON utility (like Unity's JsonUtility or Newtonsoft Json.NET)
    // to serialize and deserialize messages.

    [Serializable]
    public class WebSocketMessage<T>
    {
        public string type;
        public T payload;
    }

    // --- Payloads Sent from Client to Server ---

    [Serializable]
    public class GazePayload
    {
        public float x;
        public float y;
    }

    [Serializable]
    public class ScreenshotPayload
    {
        public string image; // Base64 encoded string
        public string sourceLang;
        public string targetLang;
    }

    [Serializable]
    public class ConfigPayload
    {
        public GazeConfig gaze;
        public TranslationConfig translation;
    }

    [Serializable]
    public class GazeConfig
    {
        public float? timeThreshold;
        public float? stabilityThreshold;
    }

    [Serializable]
    public class TranslationConfig
    {
        public string engine;
        public string targetLang;
        public DeepLConfig deepl;
    }

    [Serializable]
    public class DeepLConfig
    {
        public string apiKey;
    }

    // --- Payloads Received from Server ---

    [Serializable]
    public class StatusPayload
    {
        public string message;
    }

    [Serializable]
    public class TranslationResultPayload
    {
        public string original;
        public string translation;
    }

    [Serializable]
    public class ErrorPayload
    {
        public string message;
        public string details;
        public string errorCode;
    }

}

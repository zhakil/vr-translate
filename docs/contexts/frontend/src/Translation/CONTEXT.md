# Translation Module Context

## 模块职责
负责翻译结果的接收、处理、显示和管理，提供非侵入式的翻译UI体验，确保翻译内容以最佳方式呈现给用户。

## 开发Context

### 核心功能
1. **翻译结果接收**
   - 接收网络模块传来的翻译结果
   - 验证翻译数据完整性
   - 处理翻译错误和异常情况
   - 管理翻译结果缓存

2. **UI显示管理**
   - 动态创建翻译显示面板
   - 管理显示位置和样式
   - 实现平滑的显示/隐藏动画
   - 处理多翻译结果的显示

3. **用户交互**
   - 翻译面板的交互控制
   - 显示时长和自动隐藏
   - 手柄操作支持
   - 可访问性功能

### 主要类结构

#### TranslationDisplay.cs
```csharp
public class TranslationDisplay : MonoBehaviour
{
    [Header("显示配置")]
    [SerializeField] private GameObject translationPanelPrefab;
    [SerializeField] private Transform displayParent;
    [SerializeField] private Vector3 defaultDisplayOffset = new Vector3(0.5f, -0.3f, 1.0f);
    [SerializeField] private float autoHideDelay = 5.0f;
    
    [Header("动画配置")]
    [SerializeField] private float fadeInDuration = 0.3f;
    [SerializeField] private float fadeOutDuration = 0.3f;
    [SerializeField] private AnimationCurve displayCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
    
    [Header("UI设置")]
    [SerializeField] private float maxPanelWidth = 400f;
    [SerializeField] private float maxPanelHeight = 200f;
    [SerializeField] private int maxDisplayedTranslations = 3;
    
    // 显示管理
    private readonly List<TranslationPanel> activePanels = new List<TranslationPanel>();
    private readonly Queue<TranslationPanel> panelPool = new Queue<TranslationPanel>();
    private Camera vrCamera;
    
    // 事件
    public static event Action<TranslationResultData> OnTranslationDisplayed;
    public static event Action<string> OnTranslationHidden;
    
    public void ShowTranslation(TranslationResultData translationData);
    public void HideTranslation(string translationId);
    public void HideAllTranslations();
    public void UpdateDisplaySettings(TranslationDisplaySettings settings);
}
```

#### TranslationPanel.cs
```csharp
public class TranslationPanel : MonoBehaviour
{
    [Header("UI组件")]
    [SerializeField] private TextMeshProUGUI originalTextUI;
    [SerializeField] private TextMeshProUGUI translatedTextUI;
    [SerializeField] private Image backgroundImage;
    [SerializeField] private Image borderImage;
    [SerializeField] private Button closeButton;
    [SerializeField] private Button copyButton;
    
    [Header("布局配置")]
    [SerializeField] private LayoutGroup layoutGroup;
    [SerializeField] private ContentSizeFitter sizeFitter;
    [SerializeField] private float minWidth = 200f;
    [SerializeField] private float maxWidth = 400f;
    
    // 翻译数据
    public TranslationResultData TranslationData { get; private set; }
    public string TranslationId { get; private set; }
    public bool IsVisible { get; private set; }
    
    // 动画和计时
    private Coroutine hideCoroutine;
    private Coroutine animationCoroutine;
    private float displayTime;
    
    public void Initialize(TranslationResultData data, TranslationDisplaySettings settings);
    public void Show(Vector3 worldPosition, float duration = 0.3f);
    public void Hide(float duration = 0.3f);
    public void UpdateContent(TranslationResultData data);
    public void UpdatePosition(Vector3 worldPosition);
}
```

### 显示位置管理

#### 位置计算器
```csharp
public class TranslationPositionCalculator
{
    private Camera vrCamera;
    private readonly List<TranslationPanel> activePanels;
    
    public Vector3 CalculateOptimalPosition(Vector3 gazePoint, TranslationPanel newPanel)
    {
        // 基于注视点计算显示位置
        Vector3 basePosition = CalculateBasePosition(gazePoint);
        
        // 避免与现有面板重叠
        Vector3 finalPosition = AvoidOverlap(basePosition, newPanel);
        
        // 确保在相机视野内
        finalPosition = ClampToViewport(finalPosition);
        
        // 确保适当的距离
        finalPosition = EnsureMinDistance(finalPosition);
        
        return finalPosition;
    }
    
    private Vector3 CalculateBasePosition(Vector3 gazePoint)
    {
        // 将注视点转换为相机空间
        Vector3 cameraSpacePoint = vrCamera.transform.InverseTransformPoint(gazePoint);
        
        // 在注视点附近计算显示位置
        Vector3 offset = defaultDisplayOffset;
        
        // 根据注视点位置调整偏移
        if (cameraSpacePoint.x > 0) offset.x = -offset.x; // 注视右边时显示在左边
        if (cameraSpacePoint.y > vrCamera.transform.position.y) offset.y = -offset.y;
        
        return gazePoint + vrCamera.transform.TransformDirection(offset);
    }
    
    private Vector3 AvoidOverlap(Vector3 targetPosition, TranslationPanel newPanel)
    {
        foreach (var panel in activePanels)
        {
            if (panel == newPanel) continue;
            
            float distance = Vector3.Distance(targetPosition, panel.transform.position);
            float minDistance = CalculateMinimumDistance(panel, newPanel);
            
            if (distance < minDistance)
            {
                // 计算避让位置
                Vector3 direction = (targetPosition - panel.transform.position).normalized;
                targetPosition = panel.transform.position + direction * minDistance;
            }
        }
        
        return targetPosition;
    }
    
    private Vector3 ClampToViewport(Vector3 worldPosition)
    {
        // 转换到视口坐标
        Vector3 viewportPoint = vrCamera.WorldToViewportPoint(worldPosition);
        
        // 限制在视口边界内
        viewportPoint.x = Mathf.Clamp(viewportPoint.x, 0.1f, 0.9f);
        viewportPoint.y = Mathf.Clamp(viewportPoint.y, 0.2f, 0.8f);
        viewportPoint.z = Mathf.Max(viewportPoint.z, 1.0f); // 确保在相机前方
        
        return vrCamera.ViewportToWorldPoint(viewportPoint);
    }
}
```

### 面板管理系统

#### 对象池管理
```csharp
public class TranslationPanelPool
{
    private readonly Queue<TranslationPanel> availablePanels = new Queue<TranslationPanel>();
    private readonly HashSet<TranslationPanel> activePanels = new HashSet<TranslationPanel>();
    private readonly GameObject panelPrefab;
    private readonly Transform poolParent;
    
    public TranslationPanel GetPanel()
    {
        TranslationPanel panel;
        
        if (availablePanels.Count > 0)
        {
            panel = availablePanels.Dequeue();
        }
        else
        {
            panel = GameObject.Instantiate(panelPrefab, poolParent).GetComponent<TranslationPanel>();
        }
        
        activePanels.Add(panel);
        return panel;
    }
    
    public void ReturnPanel(TranslationPanel panel)
    {
        if (activePanels.Remove(panel))
        {
            panel.gameObject.SetActive(false);
            panel.Reset();
            availablePanels.Enqueue(panel);
        }
    }
    
    public void CleanupPool()
    {
        // 清理多余的面板对象
        while (availablePanels.Count > maxPoolSize)
        {
            var panel = availablePanels.Dequeue();
            GameObject.Destroy(panel.gameObject);
        }
    }
}
```

#### 显示队列管理
```csharp
public class TranslationDisplayQueue
{
    private readonly Queue<TranslationRequest> pendingTranslations = new Queue<TranslationRequest>();
    private readonly Dictionary<string, TranslationPanel> displayedTranslations = new Dictionary<string, TranslationPanel>();
    private readonly int maxSimultaneousDisplays;
    
    public void EnqueueTranslation(TranslationResultData data)
    {
        var request = new TranslationRequest
        {
            data = data,
            timestamp = Time.time,
            priority = CalculatePriority(data)
        };
        
        pendingTranslations.Enqueue(request);
        ProcessQueue();
    }
    
    private void ProcessQueue()
    {
        while (pendingTranslations.Count > 0 && displayedTranslations.Count < maxSimultaneousDisplays)
        {
            var request = pendingTranslations.Dequeue();
            DisplayTranslation(request);
        }
    }
    
    private int CalculatePriority(TranslationResultData data)
    {
        int priority = 0;
        
        // 基于置信度的优先级
        priority += (int)(data.confidence * 10);
        
        // 基于文本长度的优先级
        if (data.originalText.Length < 50) priority += 5;
        
        // 基于翻译质量的优先级
        if (data.translationConfidence > 0.9f) priority += 3;
        
        return priority;
    }
}
```

### 动画系统

#### 显示动画
```csharp
public class TranslationAnimator
{
    public static IEnumerator AnimateShow(TranslationPanel panel, Vector3 targetPosition, float duration)
    {
        panel.gameObject.SetActive(true);
        
        // 初始状态
        var canvasGroup = panel.GetComponent<CanvasGroup>();
        var rectTransform = panel.GetComponent<RectTransform>();
        
        canvasGroup.alpha = 0f;
        rectTransform.localScale = Vector3.zero;
        panel.transform.position = targetPosition;
        
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            
            // 使用缓动曲线
            float easedT = EaseOutBounce(t);
            
            canvasGroup.alpha = Mathf.Lerp(0f, 1f, t);
            rectTransform.localScale = Vector3.Lerp(Vector3.zero, Vector3.one, easedT);
            
            yield return null;
        }
        
        canvasGroup.alpha = 1f;
        rectTransform.localScale = Vector3.one;
    }
    
    public static IEnumerator AnimateHide(TranslationPanel panel, float duration)
    {
        var canvasGroup = panel.GetComponent<CanvasGroup>();
        var rectTransform = panel.GetComponent<RectTransform>();
        
        float startAlpha = canvasGroup.alpha;
        Vector3 startScale = rectTransform.localScale;
        
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            
            canvasGroup.alpha = Mathf.Lerp(startAlpha, 0f, t);
            rectTransform.localScale = Vector3.Lerp(startScale, Vector3.zero, t);
            
            yield return null;
        }
        
        panel.gameObject.SetActive(false);
    }
    
    private static float EaseOutBounce(float t)
    {
        if (t < 1f / 2.75f)
        {
            return 7.5625f * t * t;
        }
        else if (t < 2f / 2.75f)
        {
            return 7.5625f * (t -= 1.5f / 2.75f) * t + 0.75f;
        }
        else if (t < 2.5f / 2.75f)
        {
            return 7.5625f * (t -= 2.25f / 2.75f) * t + 0.9375f;
        }
        else
        {
            return 7.5625f * (t -= 2.625f / 2.75f) * t + 0.984375f;
        }
    }
}
```

### 内容格式化

#### 文本处理器
```csharp
public class TranslationTextProcessor
{
    public static FormattedText FormatTranslationText(TranslationResultData data, TranslationDisplaySettings settings)
    {
        var formatted = new FormattedText();
        
        // 处理原文
        formatted.originalText = ProcessOriginalText(data.originalText, settings);
        
        // 处理译文
        formatted.translatedText = ProcessTranslatedText(data.translatedText, settings);
        
        // 添加元信息
        if (settings.showMetadata)
        {
            formatted.metadata = FormatMetadata(data);
        }
        
        return formatted;
    }
    
    private static string ProcessOriginalText(string text, TranslationDisplaySettings settings)
    {
        // 文本清理
        text = text.Trim();
        
        // 长度限制
        if (text.Length > settings.maxOriginalTextLength)
        {
            text = text.Substring(0, settings.maxOriginalTextLength - 3) + "...";
        }
        
        // 格式化
        if (settings.highlightOriginalText)
        {
            text = $"<color={settings.originalTextColor}>{text}</color>";
        }
        
        return text;
    }
    
    private static string ProcessTranslatedText(string text, TranslationDisplaySettings settings)
    {
        // 文本清理
        text = text.Trim();
        
        // 换行处理
        if (settings.enableWordWrap)
        {
            text = InsertLineBreaks(text, settings.maxLineLength);
        }
        
        // 字体大小
        text = $"<size={settings.translatedTextSize}>{text}</size>";
        
        // 颜色
        text = $"<color={settings.translatedTextColor}>{text}</color>";
        
        return text;
    }
    
    private static string FormatMetadata(TranslationResultData data)
    {
        var metadata = new StringBuilder();
        
        metadata.AppendLine($"<size=12><color=#888888>");
        metadata.AppendLine($"语言: {data.sourceLanguage} → {data.targetLanguage}");
        metadata.AppendLine($"置信度: {data.confidence:P1}");
        metadata.AppendLine($"提供商: {data.provider}");
        metadata.AppendLine($"</color></size>");
        
        return metadata.ToString();
    }
}
```

### 用户交互

#### 手柄控制
```csharp
public class TranslationPanelInteraction : MonoBehaviour
{
    [Header("交互配置")]
    [SerializeField] private float interactionDistance = 2.0f;
    [SerializeField] private LayerMask interactionLayers;
    [SerializeField] private XRRayInteractor rayInteractor;
    
    private TranslationPanel currentHoveredPanel;
    private TranslationPanel currentSelectedPanel;
    
    private void Update()
    {
        HandleRaycastInteraction();
        HandleControllerInput();
    }
    
    private void HandleRaycastInteraction()
    {
        if (rayInteractor.TryGetCurrent3DRaycastHit(out RaycastHit hit))
        {
            var panel = hit.collider.GetComponent<TranslationPanel>();
            
            if (panel != currentHoveredPanel)
            {
                // 离开之前的面板
                if (currentHoveredPanel != null)
                {
                    currentHoveredPanel.OnHoverExit();
                }
                
                // 进入新面板
                currentHoveredPanel = panel;
                if (panel != null)
                {
                    panel.OnHoverEnter();
                }
            }
        }
        else if (currentHoveredPanel != null)
        {
            currentHoveredPanel.OnHoverExit();
            currentHoveredPanel = null;
        }
    }
    
    private void HandleControllerInput()
    {
        // 选择操作
        if (Input.GetButtonDown("XRI_Right_TriggerButton") && currentHoveredPanel != null)
        {
            SelectPanel(currentHoveredPanel);
        }
        
        // 关闭操作
        if (Input.GetButtonDown("XRI_Right_MenuButton") && currentSelectedPanel != null)
        {
            ClosePanel(currentSelectedPanel);
        }
        
        // 复制操作 (如果支持)
        if (Input.GetButtonDown("XRI_Right_GripButton") && currentSelectedPanel != null)
        {
            CopyTranslationToClipboard(currentSelectedPanel);
        }
    }
    
    private void SelectPanel(TranslationPanel panel)
    {
        if (currentSelectedPanel != null)
        {
            currentSelectedPanel.OnDeselected();
        }
        
        currentSelectedPanel = panel;
        panel.OnSelected();
        
        // 扩展显示时间
        panel.ExtendDisplayTime(additionalDisplayTime);
    }
}
```

### 可访问性支持

#### 可访问性管理器
```csharp
public class TranslationAccessibility
{
    [Header("可访问性设置")]
    [SerializeField] private bool enableVoiceOver = false;
    [SerializeField] private bool enableHighContrast = false;
    [SerializeField] private float fontScaleMultiplier = 1.0f;
    
    public void ApplyAccessibilitySettings(TranslationPanel panel, AccessibilitySettings settings)
    {
        // 字体缩放
        if (settings.fontScale != 1.0f)
        {
            ApplyFontScaling(panel, settings.fontScale);
        }
        
        // 高对比度
        if (settings.highContrastMode)
        {
            ApplyHighContrastColors(panel);
        }
        
        // 语音朗读
        if (settings.enableTTS)
        {
            ReadTranslationAloud(panel.TranslationData);
        }
    }
    
    private void ApplyFontScaling(TranslationPanel panel, float scale)
    {
        var textComponents = panel.GetComponentsInChildren<TextMeshProUGUI>();
        foreach (var text in textComponents)
        {
            text.fontSize *= scale;
        }
    }
    
    private void ApplyHighContrastColors(TranslationPanel panel)
    {
        // 应用高对比度颜色方案
        panel.backgroundImage.color = Color.black;
        panel.borderImage.color = Color.white;
        
        var textComponents = panel.GetComponentsInChildren<TextMeshProUGUI>();
        foreach (var text in textComponents)
        {
            text.color = Color.white;
        }
    }
    
    private void ReadTranslationAloud(TranslationResultData data)
    {
        // 集成TTS系统
        if (TTSManager.Instance != null)
        {
            TTSManager.Instance.Speak(data.translatedText, data.targetLanguage);
        }
    }
}
```

### 配置管理

#### 显示设置
```csharp
[CreateAssetMenu(fileName = "TranslationDisplayConfig", menuName = "VRTranslate/Translation Display Config")]
public class TranslationDisplayConfig : ScriptableObject
{
    [Header("布局设置")]
    public Vector3 defaultOffset = new Vector3(0.5f, -0.3f, 1.0f);
    public float maxPanelWidth = 400f;
    public float maxPanelHeight = 200f;
    public int maxSimultaneousDisplays = 3;
    
    [Header("动画设置")]
    public float fadeInDuration = 0.3f;
    public float fadeOutDuration = 0.3f;
    public AnimationCurve displayCurve;
    
    [Header("自动隐藏")]
    public float autoHideDelay = 5.0f;
    public bool hideOnGazeAway = true;
    public float gazeAwayThreshold = 2.0f;
    
    [Header("文本设置")]
    public float originalTextSize = 14f;
    public float translatedTextSize = 16f;
    public Color originalTextColor = Color.gray;
    public Color translatedTextColor = Color.white;
    public bool showMetadata = true;
    
    [Header("交互设置")]
    public bool enableControllerInteraction = true;
    public bool enableGazeInteraction = false;
    public float interactionDistance = 2.0f;
}
```

## 开发优先级
1. **基础显示功能** - 翻译面板创建和显示
2. **位置管理** - 智能位置计算和重叠避免
3. **动画系统** - 平滑的显示/隐藏动画
4. **交互控制** - 手柄操作和用户控制
5. **性能优化** - 对象池和显示队列
6. **可访问性** - 字体缩放、高对比度、TTS

## 质量检查清单
- [ ] 翻译结果正确显示
- [ ] 显示位置智能且美观
- [ ] 动画流畅自然
- [ ] 手柄交互响应正常
- [ ] 性能稳定无卡顿
- [ ] 可访问性功能完整
- [ ] 配置灵活易调整
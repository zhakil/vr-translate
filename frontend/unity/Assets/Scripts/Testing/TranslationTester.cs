using UnityEngine;
using UnityEngine.UI;

/**
 * 翻译功能测试脚本
 * 提供手动测试按钮和自动测试功能
 */
public class TranslationTester : MonoBehaviour
{
    [Header("测试按钮")]
    public Button screenshotButton;
    public Button connectTestButton;
    
    [Header("测试组件引用")]
    public GazeDetector gazeDetector;
    public NetworkManager networkManager;
    
    [Header("测试设置")]
    [Tooltip("自动测试间隔（秒）")]
    public float autoTestInterval = 5f;
    
    [Tooltip("启用自动循环测试")]
    public bool enableAutoTest = false;
    
    private float lastAutoTestTime;

    void Start()
    {
        InitializeTestButtons();
        
        // 自动查找组件
        if (gazeDetector == null)
            gazeDetector = FindFirstObjectByType<GazeDetector>();
            
        if (networkManager == null)
            networkManager = NetworkManager.Instance;
            
        Debug.Log("TranslationTester: 测试组件已初始化");
    }

    void Update()
    {
        // 自动测试功能
        if (enableAutoTest && Time.time - lastAutoTestTime > autoTestInterval)
        {
            TriggerAutoTest();
            lastAutoTestTime = Time.time;
        }
        
        // 键盘快捷键
        if (Input.GetKeyDown(KeyCode.Space))
        {
            TriggerScreenshotTest();
        }
        
        if (Input.GetKeyDown(KeyCode.C))
        {
            TestConnection();
        }
    }

    private void InitializeTestButtons()
    {
        // 配置截图测试按钮
        if (screenshotButton != null)
        {
            screenshotButton.onClick.AddListener(TriggerScreenshotTest);
            Debug.Log("TranslationTester: 截图测试按钮已配置");
        }
        
        // 配置连接测试按钮
        if (connectTestButton != null)
        {
            connectTestButton.onClick.AddListener(TestConnection);
            Debug.Log("TranslationTester: 连接测试按钮已配置");
        }
    }

    public void TriggerScreenshotTest()
    {
        if (gazeDetector == null)
        {
            Debug.LogError("TranslationTester: GazeDetector未找到！");
            return;
        }
        
        Debug.Log("🧪 TranslationTester: 手动触发截图测试");
        
        // 使用屏幕中心位置进行测试
        float centerX = Screen.width / 2f;
        float centerY = Screen.height / 2f;
        
        gazeDetector.RequestScreenshot(centerX, centerY);
        
        Debug.Log($"📸 截图测试已触发 - 位置: ({centerX}, {centerY})");
    }

    public void TestConnection()
    {
        if (networkManager == null)
        {
            Debug.LogError("TranslationTester: NetworkManager未找到！");
            return;
        }
        
        Debug.Log("🔗 TranslationTester: 测试网络连接状态");
        
        bool isConnected = networkManager.IsConnected();
        string status = isConnected ? "已连接" : "未连接";
        
        Debug.Log($"📡 网络状态: {status}");
        
        if (!isConnected)
        {
            Debug.LogWarning("⚠️ 网络未连接，请检查服务器状态");
        }
    }

    private void TriggerAutoTest()
    {
        Debug.Log("🤖 TranslationTester: 自动测试循环");
        TriggerScreenshotTest();
    }

    // 公共方法供其他脚本调用
    public void EnableAutoTest(bool enable)
    {
        enableAutoTest = enable;
        Debug.Log($"TranslationTester: 自动测试 {(enable ? "启用" : "禁用")}");
    }

    public void SetAutoTestInterval(float interval)
    {
        autoTestInterval = Mathf.Max(1f, interval);
        Debug.Log($"TranslationTester: 自动测试间隔设置为 {autoTestInterval} 秒");
    }

    void OnGUI()
    {
        // 简单的调试GUI
        if (Application.isPlaying)
        {
            GUILayout.BeginArea(new Rect(10, 10, 300, 200));
            GUILayout.Label("🧪 VR翻译测试工具", GUIStyle.none);
            
            if (GUILayout.Button("📸 截图测试 (Space)"))
            {
                TriggerScreenshotTest();
            }
            
            if (GUILayout.Button("🔗 连接测试 (C)"))
            {
                TestConnection();
            }
            
            GUILayout.Label($"自动测试: {(enableAutoTest ? "开启" : "关闭")}");
            GUILayout.Label($"测试间隔: {autoTestInterval}秒");
            
            GUILayout.EndArea();
        }
    }
}
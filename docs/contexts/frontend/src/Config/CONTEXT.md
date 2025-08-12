# Config Module Context

## 模块职责
负责VR应用的配置管理，包括用户设置持久化、默认配置管理、配置验证和动态配置更新。

## 开发Context

### 核心功能
1. **配置数据管理**
   - 用户设置的加载和保存
   - 默认配置提供
   - 配置数据验证
   - 配置版本管理

2. **持久化存储**
   - 本地文件存储
   - PlayerPrefs备份
   - 云端配置同步
   - 配置迁移

3. **配置监听**
   - 配置变更通知
   - 实时配置更新
   - 配置回滚机制
   - 配置冲突解决

### 主要类结构

#### ConfigManager.cs
```csharp
public class ConfigManager : MonoBehaviour, IConfigManager
{
    [Header("配置文件")]
    [SerializeField] private string configFileName = "vr-translate-config.json";
    [SerializeField] private VRTranslateConfig defaultConfig;
    
    // 当前配置
    public VRTranslateConfig CurrentConfig { get; private set; }
    
    // 事件系统
    public static event Action<VRTranslateConfig> OnConfigLoaded;
    public static event Action<VRTranslateConfig> OnConfigChanged;
    public static event Action<string> OnConfigError;
    
    // 单例
    public static ConfigManager Instance { get; private set; }
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadConfig();
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    public void LoadConfig();
    public void SaveConfig();
    public void ResetToDefaults();
    public bool ValidateConfig(VRTranslateConfig config);
    public void UpdateConfig(VRTranslateConfig newConfig);
}

[Serializable]
public class VRTranslateConfig
{
    public string version = "1.0.0";
    public EyeTrackingConfig eyeTracking;
    public GazeDetectionConfig gazeDetection;
    public NetworkConfig network;
    public TranslationConfig translation;
    public UIConfig ui;
    public PerformanceConfig performance;
    public DebugConfig debug;
}
```

### 配置存储系统

#### ConfigStorage.cs
```csharp
public static class ConfigStorage
{
    private static readonly string ConfigDirectory = Path.Combine(Application.persistentDataPath, "Config");
    
    public static bool SaveConfig(VRTranslateConfig config, string fileName)
    {
        try
        {
            // 确保目录存在
            Directory.CreateDirectory(ConfigDirectory);
            
            string filePath = Path.Combine(ConfigDirectory, fileName);
            string json = JsonUtility.ToJson(config, true);
            
            // 创建备份
            CreateBackup(filePath);
            
            // 写入新配置
            File.WriteAllText(filePath, json);
            
            Debug.Log($"配置已保存到: {filePath}");
            return true;
        }
        catch (Exception ex)
        {
            Debug.LogError($"保存配置失败: {ex.Message}");
            return false;
        }
    }
    
    public static VRTranslateConfig LoadConfig(string fileName, VRTranslateConfig defaultConfig)
    {
        try
        {
            string filePath = Path.Combine(ConfigDirectory, fileName);
            
            if (!File.Exists(filePath))
            {
                Debug.Log("配置文件不存在，使用默认配置");
                return defaultConfig;
            }
            
            string json = File.ReadAllText(filePath);
            var config = JsonUtility.FromJson<VRTranslateConfig>(json);
            
            // 验证和迁移配置
            config = ValidateAndMigrateConfig(config, defaultConfig);
            
            Debug.Log($"配置已从 {filePath} 加载");
            return config;
        }
        catch (Exception ex)
        {
            Debug.LogError($"加载配置失败: {ex.Message}");
            
            // 尝试从备份恢复
            var backupConfig = TryRestoreFromBackup(fileName, defaultConfig);
            return backupConfig ?? defaultConfig;
        }
    }
    
    private static void CreateBackup(string filePath)
    {
        if (File.Exists(filePath))
        {
            string backupPath = filePath + ".backup";
            File.Copy(filePath, backupPath, true);
        }
    }
    
    private static VRTranslateConfig TryRestoreFromBackup(string fileName, VRTranslateConfig defaultConfig)
    {
        try
        {
            string backupPath = Path.Combine(ConfigDirectory, fileName + ".backup");
            if (File.Exists(backupPath))
            {
                string json = File.ReadAllText(backupPath);
                return JsonUtility.FromJson<VRTranslateConfig>(json);
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"从备份恢复配置失败: {ex.Message}");
        }
        
        return null;
    }
}
```

## 开发优先级
1. **基础配置管理** - 加载、保存、默认值
2. **配置验证** - 数据验证、版本检查
3. **事件系统** - 配置变更通知
4. **错误处理** - 备份恢复、异常处理
5. **高级功能** - 云同步、配置迁移

## 质量检查清单
- [ ] 配置正确加载和保存
- [ ] 默认配置完整有效
- [ ] 配置验证逻辑正确
- [ ] 错误处理机制完善
- [ ] 配置变更通知及时
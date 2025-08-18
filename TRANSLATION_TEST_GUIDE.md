# VR翻译功能测试指南

## 🎯 测试目标
测试完整的翻译工作流程：注视检测 → 截图 → OCR → 翻译 → 显示结果

## 🏗️ 第一步：创建测试场景

### 1. 在Unity中创建3D文本对象

#### A. 创建英文文本对象
1. **右键Hierarchy → 3D Object → Text - TextMeshPro**
2. 名称：`EnglishText`
3. 位置：`(0, 2, 5)` - 在相机前方
4. 文本内容：`Hello World`
5. 字体大小：`3`
6. 颜色：白色

#### B. 创建中文文本对象  
1. **右键Hierarchy → 3D Object → Text - TextMeshPro**
2. 名称：`ChineseText`
3. 位置：`(-3, 1, 4)` - 相机左侧
4. 文本内容：`你好世界`
5. 字体大小：`2.5`
6. 颜色：黄色

#### C. 创建复杂英文文本
1. **右键Hierarchy → 3D Object → Text - TextMeshPro**
2. 名称：`ComplexText`
3. 位置：`(3, 0, 6)` - 相机右侧
4. 文本内容：`Welcome to VR Translation`
5. 字体大小：`2`
6. 颜色：蓝色

### 2. 创建UI显示区域

#### A. 创建Canvas（如果没有）
1. **右键Hierarchy → UI → Canvas**
2. 设置 **Render Mode**: `Screen Space - Overlay`

#### B. 创建翻译结果显示
1. **右键Canvas → UI → Text - TextMeshPro**
2. 名称：`TranslationResult`
3. 位置：屏幕底部
4. 文本：`Translation will appear here...`
5. 字体大小：`24`
6. 颜色：绿色

#### C. 创建状态显示
1. **右键Canvas → UI → Text - TextMeshPro**
2. 名称：`StatusDisplay`
3. 位置：屏幕顶部
4. 文本：`Ready for testing...`
5. 字体大小：`18`
6. 颜色：白色

### 3. 配置UIManager引用

选中 **UIManager** GameObject：
- **Translation Text**: 拖拽 `TranslationResult` 到此字段
- **Status Text**: 拖拽 `StatusDisplay` 到此字段
- **Connection Status Text**: 拖拽 `StatusDisplay` 到此字段（临时使用同一个）

## 🧪 第二步：测试工作流程

### 1. 基础连接测试
1. **点击Play** ▶️
2. **检查Console**：应该显示 `Successfully connected to server!`
3. **检查UI**：状态应该显示连接成功

### 2. 注视检测测试
1. **在Scene视图中**：
   - 选中MainCamera
   - 移动相机对准不同的文本对象
   - 观察红色注视射线

2. **在Game视图中**：
   - 应该能看到UI显示更新
   - Console应该显示注视数据发送日志

### 3. 截图功能测试
我们需要手动触发截图测试：

#### A. 添加测试按钮
1. **右键Canvas → UI → Button - TextMeshPro**
2. 名称：`TestScreenshotButton`
3. 文本：`Test Screenshot`
4. 位置：屏幕中央

#### B. 创建测试脚本
需要一个简单的测试脚本来触发截图：

```csharp
using UnityEngine;
using UnityEngine.UI;

public class TranslationTester : MonoBehaviour
{
    public Button screenshotButton;
    public GazeDetector gazeDetector;

    void Start()
    {
        if (screenshotButton != null && gazeDetector != null)
        {
            screenshotButton.onClick.AddListener(() => {
                Debug.Log("Manual screenshot test triggered");
                gazeDetector.RequestScreenshot(Screen.width / 2, Screen.height / 2);
            });
        }
    }
}
```

## 🎮 第三步：实际测试步骤

### 1. 准备测试
1. 确保服务器正在运行
2. Unity项目在Play模式
3. 所有UI元素正确显示

### 2. 执行测试
1. **移动相机对准英文文本**
2. **点击"Test Screenshot"按钮**
3. **观察以下输出**：
   - Console中的截图日志
   - 服务器日志中的请求
   - UI中的翻译结果

### 3. 期待结果
- **Console**: `Screenshot sent to server.`
- **UI翻译结果**: `翻译结果: Hello World` (模拟翻译)
- **服务器日志**: `POST /api/screenshot`

## 🔧 故障排除

### 问题1：截图功能不工作
- 检查GazeDetector的ConfigManager引用
- 确保NetworkManager连接正常

### 问题2：没有翻译结果
- 检查UIManager的引用设置
- 确保TranslationManager正常工作

### 问题3：服务器连接失败
- 确认服务器在端口3000运行
- 检查NetworkManager的服务器URL设置

## ✅ 成功标志

测试成功时你应该看到：
1. ✅ 注视射线指向文本对象
2. ✅ 截图功能触发成功
3. ✅ 服务器接收到截图数据
4. ✅ UI显示模拟翻译结果
5. ✅ Console无错误信息

## 🎯 下一步

测试成功后，我们可以：
1. 添加自动注视触发截图
2. 集成真实OCR识别
3. 添加真实翻译API
4. 优化用户界面

**准备好开始测试了吗？** 🚀
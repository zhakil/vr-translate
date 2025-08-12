# UI Module Context

## 模块职责
负责VR应用的用户界面系统，包括配置输入、状态显示和翻译结果的呈现。提供一个简洁、实用的VR原生UI体验。

## 核心功能
1.  **状态显示**: 实时显示与后端服务器的连接状态（如“已连接”、“已断开”），以及来自后端的状态消息（如“正在OCR识别...”、“翻译完成”）。
2.  **结果呈现**: 清晰地展示OCR识别出的原文和翻译服务返回的译文。
3.  **参数配置**: 提供交互控件，允许用户在运行时动态修改应用配置，并将这些配置发送到后端。具体包括：
    *   目标翻译语言。
    *   眼动追踪的触发时间和敏感度。
4.  **错误反馈**: 当发生错误时，在UI上显示红色的错误信息。

## 具体UI组件 (UIManager.cs)
`UIManager.cs` 脚本是UI系统的核心，它需要与Unity场景中的具体UI元素进行关联。以下是其在Unity检视面板(Inspector)中需要配置的公共字段：

### 依赖项 (Dependencies)
*   `configManager`: **(ConfigManager)**
    *   必须链接到场景中的 `ConfigManager` 实例，用于读取和发送配置更新。

### 显示元素 (Display Elements)
*   `translationText`: **(TextMeshProUGUI)**
    *   用于显示最终翻译结果的文本框。
*   `originalText`: **(TextMeshProUGUI)**
    *   用于显示从截图中识别出的原始文本。
*   `statusText`: **(TextMeshProUGUI)**
    *   用于显示来自服务器的通用状态消息或错误信息。
*   `connectionStatusText`: **(TextMeshProUGUI)**
    *   专门用于显示WebSocket的连接状态。

### 配置输入 (Configuration Inputs)
*   `targetLanguageInput`: **(TMP_InputField)**
    *   一个输入框，允许用户输入目标语言代码（例如 `en`, `zh`, `fr`）。
*   `gazeTimeSlider`: **(Slider)**
    *   一个滑块，用于调整注视识别的时间阈值（单位：毫秒）。
*   `gazeTimeValueText`: **(TextMeshProUGUI)**
    *   一个文本标签，用于实时显示 `gazeTimeSlider` 的当前值。
*   `gazeStabilitySlider`: **(Slider)**
    *   一个滑块，用于调整注视点的稳定范围阈值（单位：像素）。
*   `gazeStabilityValueText`: **(TextMeshProUGUI)**
    *   一个文本标签，用于实时显示 `gazeStabilitySlider` 的当前值。

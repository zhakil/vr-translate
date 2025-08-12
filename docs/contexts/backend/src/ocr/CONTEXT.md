# OCR Service Context
## 模块职责
接收截图数据，调用第三方OCR服务将其转换为文本。提供一个统一的接口，以便未来可以方便地切换或集成多个OCR引擎。
## 开发Context
### 核心功能
1. **OCR引擎抽象接口**
   - 定义一个`IOCREngine`接口，包含`recognize(imageBuffer): Promise<string>`方法。
2. **多引擎实现**
   - 实现Google Vision, Tesseract等不同OCR服务的适配器。
3. **服务选择与容错**
   - 根据配置选择使用的OCR引擎。
   - 实现重试和故障转移逻辑。

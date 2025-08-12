# Translation Service Context
## 模块职责
接收文本数据，调用第三方翻译服务进行翻译。提供统一接口，支持多语言和多翻译引擎切换。
## 开发Context
### 核心功能
1. **翻译引擎抽象接口**
   - 定义`ITranslationEngine`接口，包含`translate(text, sourceLang, targetLang): Promise<string>`方法。
2. **多引擎实现**
   - 实现Google Translate, DeepL等翻译服务的适配器。
3. **智能缓存**
   - 对翻译结果进行缓存（如使用Redis），减少API调用，提高响应速度。

# VR Translation Service - 外部集成指南

## 🌟 概述

VR翻译服务现已提供完整的外部调用支持，包含REST API接口、多语言SDK以及WebSocket实时通信。开发者可以轻松将VR翻译功能集成到任何应用中。

## 🚀 快速开始

### 1. 启动服务

```bash
cd backend
npm run dev
```

服务将启动在以下地址：
- **REST API**: http://localhost:8080
- **WebSocket**: ws://localhost:8081
- **测试界面**: http://localhost:8080/
- **API文档**: http://localhost:8080/api/docs

### 2. 快速测试

```bash
# 测试翻译API
curl -X POST http://localhost:8080/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World", "sourceLang": "en", "targetLang": "zh-CN"}'

# 查看API文档
curl http://localhost:8080/api/docs
```

## 📋 完整功能清单

### REST API 接口

✅ **POST /api/translate** - 单文本翻译  
✅ **POST /api/translate/batch** - 批量翻译（最多100条）  
✅ **POST /api/ocr** - OCR图片识别  
✅ **POST /api/ocr-translate** - OCR识别后翻译  
✅ **GET /api/languages** - 获取支持的语言列表  
✅ **GET /api/stats** - 获取服务统计信息  
✅ **GET /health** - 健康检查  

### WebSocket 实时通信

✅ **gaze** - 眼动数据传输  
✅ **screenshot** - 截图翻译请求  
✅ **config** - 配置更新  
✅ **translation_result** - 翻译结果推送  

### 服务特性

✅ **多语言支持** - 16种常用语言  
✅ **速率限制** - 每小时1000次请求  
✅ **错误处理** - 完整的错误代码和消息  
✅ **批量处理** - 高效的批量翻译  
✅ **实时通信** - WebSocket双向通信  
✅ **服务监控** - 完整的运行统计  

## 💻 客户端SDK

### JavaScript SDK
```javascript
const sdk = new VRTranslateSDK({
    baseURL: 'http://localhost:8080',
    websocketURL: 'ws://localhost:8081'
});

// 翻译文本
const result = await sdk.translate('Hello World', 'en', 'zh-CN');
console.log(result.translation);
```

**文件位置**: `sdk/javascript/vr-translate-sdk.js`

### Python SDK
```python
async with VRTranslateSDK(debug=True) as sdk:
    result = await sdk.translate('Hello World', 'en', 'zh-CN')
    print(result['translation'])
```

**文件位置**: `sdk/python/vr_translate_sdk.py`

### C# SDK
```csharp
using var sdk = new VRTranslateSDK(debug: true);
var result = await sdk.TranslateAsync("Hello World", "en", "zh-CN");
Console.WriteLine(result.Translation);
```

**文件位置**: `sdk/csharp/VRTranslateSDK.cs`

## 📚 集成示例

### Web应用示例
完整的Web界面演示，包含：
- 文本翻译和批量翻译
- OCR图片识别和翻译
- WebSocket实时通信
- 服务监控和统计

**文件位置**: `examples/web-app/index.html`  
**访问地址**: 将文件复制到Web服务器或直接打开

### Python应用示例
```bash
cd examples/python-example
pip install aiohttp websockets pillow
python translate_example.py          # 运行完整演示
python translate_example.py -i       # 交互模式
```

**文件位置**: `examples/python-example/translate_example.py`

### C#应用示例
```bash
cd examples/csharp-example
dotnet add package System.Drawing.Common
dotnet run                           # 运行完整演示
dotnet run -- --interactive          # 交互模式
```

**文件位置**: `examples/csharp-example/TranslationExample.cs`

## 🔧 API 详细说明

### 基础配置
- **基础URL**: `http://localhost:8080`
- **WebSocket URL**: `ws://localhost:8081`
- **认证方式**: 无需认证（开发模式）
- **请求格式**: `application/json`
- **响应格式**: `application/json`

### 响应格式
```json
{
    "success": true,
    "data": {
        // 具体数据
    },
    "error": "错误代码",
    "message": "错误描述"
}
```

### 错误处理
```json
{
    "success": false,
    "error": "INVALID_INPUT",
    "message": "文本内容不能为空"
}
```

**常见错误代码**:
- `INVALID_INPUT` - 输入参数无效
- `RATE_LIMIT_EXCEEDED` - 请求频率过高
- `TRANSLATION_FAILED` - 翻译服务失败
- `OCR_FAILED` - OCR识别失败

### 语言代码支持
- `auto` - 自动检测
- `zh-CN` - 中文（简体）
- `en` - 英语
- `ja` - 日语
- `ko` - 韩语
- `fr` - 法语
- `de` - 德语
- `es` - 西班牙语
- `ru` - 俄语

完整语言列表请调用 `/api/languages`

## 🔌 WebSocket 通信

### 连接方式
```javascript
const ws = new WebSocket('ws://localhost:8081');
ws.onopen = () => console.log('连接成功');
```

### 消息格式
```json
{
    "type": "message_type",
    "payload": {
        // 消息数据
    },
    "id": 123,
    "timestamp": 1640995200000
}
```

### 支持的消息类型
- `gaze` - 眼动数据
- `screenshot` - 截图请求
- `config` - 配置更新
- `translation_result` - 翻译结果（服务器→客户端）

## 📊 性能和限制

### 性能指标
- **响应时间**: < 100ms (文本翻译)
- **OCR识别**: < 1秒
- **批量处理**: < 5秒 (100条文本)
- **并发连接**: 支持1000个并发WebSocket连接

### 服务限制
- **文本长度**: 最大10,000字符
- **批量翻译**: 最大100条文本
- **图片大小**: 最大10MB
- **请求速率**: 每小时1000次请求

## 🛠️ 开发和调试

### 启用调试模式
```javascript
const sdk = new VRTranslateSDK({ debug: true });
```

### 服务监控
```bash
# 查看服务状态
curl http://localhost:8080/health

# 查看详细统计
curl http://localhost:8080/api/stats
```

### 错误排查
1. **服务未启动**: 确保运行 `npm run dev`
2. **端口冲突**: 检查8080和8081端口是否被占用
3. **网络问题**: 确认防火墙设置
4. **依赖问题**: 运行 `npm install` 安装依赖

## 📖 完整API文档

详细的API文档请查看：
- **在线文档**: http://localhost:8080/api/docs
- **Markdown文档**: `docs/api/README.md`

## 🌍 多语言支持

### 当前支持的语言
- 中文（简体/繁体）
- 英语
- 日语
- 韩语
- 法语
- 德语
- 西班牙语
- 俄语
- 阿拉伯语
- 印地语
- 泰语
- 越南语
- 意大利语
- 葡萄牙语

### 添加新语言
修改 `TranslationController.ts` 中的语言列表配置。

## 🔄 集成流程

### 基本集成步骤
1. **启动服务** - 运行VR翻译服务
2. **选择SDK** - 根据开发语言选择对应SDK
3. **初始化客户端** - 配置服务地址和参数
4. **调用API** - 使用提供的方法调用翻译功能
5. **处理响应** - 处理返回的翻译结果
6. **错误处理** - 实现合适的错误处理逻辑

### 生产环境部署
1. **环境配置** - 修改生产环境URL和端口
2. **安全配置** - 添加认证和HTTPS支持
3. **负载均衡** - 配置多实例负载均衡
4. **监控告警** - 设置服务监控和告警
5. **数据备份** - 配置日志和数据备份

## 💡 最佳实践

### 性能优化
- 使用批量API减少网络请求
- 启用本地缓存避免重复翻译
- 合理使用WebSocket减少连接开销
- 监控API调用频率避免触发限制

### 错误处理
- 实现重试机制处理临时故障
- 提供降级方案确保服务可用
- 记录错误日志便于问题排查
- 向用户提供友好的错误提示

### 安全考虑
- 验证输入数据防止注入攻击
- 限制上传文件大小和类型
- 实现访问控制和权限管理
- 定期更新依赖库修复安全漏洞

## 📞 技术支持

如需技术支持或发现问题，请：
1. 查看详细的API文档和示例代码
2. 检查控制台日志和错误信息
3. 尝试提供的示例项目
4. 联系开发团队获取进一步支持

---

**VR Translation Service** - 强大、灵活、易用的翻译服务解决方案
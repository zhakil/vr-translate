# DeepL API 配置指南

## 🔑 获取DeepL API密钥

### 1. 注册DeepL API账户
访问 [DeepL API官网](https://www.deepl.com/pro-api) 并注册账户

### 2. 获取API密钥
- 登录DeepL开发者控制台
- 获取您的认证密钥 (Authentication Key)
- 免费版每月可翻译500,000字符

### 3. 配置API密钥

#### 方法1：修改配置文件
编辑 `backend/config/local.json`：
```json
{
    "deepl": {
        "apiKey": "您的DeepL_API密钥",
        "baseUrl": "https://api-free.deepl.com"
    }
}
```

#### 方法2：设置环境变量
```bash
# Windows
set DEEPL_API_KEY=您的DeepL_API密钥

# Linux/Mac
export DEEPL_API_KEY=您的DeepL_API密钥
```

## 🚀 启用DeepL翻译

配置完成后，重启后端服务：
```bash
cd backend
npm start
```

## 📊 验证配置

### 检查日志
启动后查看日志，应该看到：
```
✅ DeepL翻译引擎初始化完成
✅ TranslationService initialized with DeepL engine
```

### 测试翻译
在VR界面中输入 "hello" 翻译为中文，应该得到：
```
原文: hello
译文: 你好
```

## ⚠️ 注意事项

1. **免费版限制**: 500,000字符/月
2. **付费版**: 需要修改baseUrl为 `https://api.deepl.com`
3. **API密钥安全**: 不要将密钥提交到版本控制系统

## 🔧 故障排除

### 常见错误
- `DeepL API key not configured` → 检查API密钥配置
- `DeepL API认证失败` → 验证API密钥是否正确
- `DeepL API配额已用完` → 检查月度使用量

### 回退方案
如果DeepL配置失败，系统会自动回退到Mock翻译引擎。
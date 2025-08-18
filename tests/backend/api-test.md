# VR翻译后端API测试

## 🎯 测试目标

验证后端API的所有端点功能和数据处理能力。

## 🔧 测试环境

### 前置条件
- 后端服务器运行在 `http://localhost:3000`
- 安装了curl或Postman工具
- 服务器日志可见

## 📡 API端点测试

### 1. 健康检查端点测试

#### GET /health
**目标**: 验证服务器基础健康状态

**测试命令**:
```bash
curl -X GET http://localhost:3000/health
```

**期望响应**:
```json
{
  "status": "healthy",
  "message": "VR Translation Service", 
  "timestamp": "2025-08-18T07:15:00.000Z"
}
```

**验证点**:
- [ ] HTTP状态码: 200
- [ ] 响应包含status字段
- [ ] timestamp格式正确
- [ ] 响应时间 < 100ms

### 2. 注视数据端点测试

#### POST /api/gaze
**目标**: 验证注视数据接收和处理

**测试命令**:
```bash
curl -X POST http://localhost:3000/api/gaze \
  -H "Content-Type: application/json" \
  -d '{
    "x": 500.5,
    "y": 300.2
  }'
```

**期望响应**:
```json
{
  "success": true,
  "message": "Gaze data received",
  "timestamp": "2025-08-18T07:15:00.000Z"
}
```

**验证点**:
- [ ] HTTP状态码: 200
- [ ] success字段为true
- [ ] 服务器日志显示 `POST /api/gaze`
- [ ] 处理时间 < 50ms

**错误测试**:
```bash
# 无效JSON测试
curl -X POST http://localhost:3000/api/gaze \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

**期望错误响应**:
```json
{
  "error": "Invalid gaze data"
}
```

### 3. 截图翻译端点测试

#### POST /api/screenshot
**目标**: 验证截图数据处理和翻译功能

**测试命令**:
```bash
curl -X POST http://localhost:3000/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
    "sourceLang": "en",
    "targetLang": "zh"
  }'
```

**期望响应**:
```json
{
  "original": "Hello World",
  "translation": "你好世界",
  "confidence": 0.95,
  "timestamp": "2025-08-18T07:15:00.000Z"
}
```

**验证点**:
- [ ] HTTP状态码: 200
- [ ] 包含original和translation字段
- [ ] confidence在0-1之间
- [ ] 服务器控制台显示处理信息
- [ ] 处理时间 < 2秒

### 4. 配置更新端点测试

#### POST /api/config
**目标**: 验证配置数据接收和处理

**测试命令**:
```bash
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "translation": {
      "engine": "deepl",
      "targetLang": "zh"
    },
    "gaze": {
      "timeThreshold": 1000,
      "stabilityThreshold": 50
    }
  }'
```

**期望响应**:
```json
{
  "success": true,
  "message": "Config updated",
  "timestamp": "2025-08-18T07:15:00.000Z"
}
```

**验证点**:
- [ ] HTTP状态码: 200
- [ ] 服务器日志显示配置信息
- [ ] success字段为true

## 🔄 批量测试脚本

创建自动化测试脚本来批量测试所有端点：

### 基础功能测试
```bash
#!/bin/bash
SERVER_URL="http://localhost:3000"

echo "🧪 开始API测试..."

# 测试1: 健康检查
echo "测试健康检查端点..."
curl -s -w "状态码: %{http_code}, 响应时间: %{time_total}s\n" \
  $SERVER_URL/health

# 测试2: 注视数据
echo "测试注视数据端点..."
curl -s -X POST $SERVER_URL/api/gaze \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 200}' \
  -w "状态码: %{http_code}, 响应时间: %{time_total}s\n"

# 测试3: 截图翻译
echo "测试截图翻译端点..."
curl -s -X POST $SERVER_URL/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"image": "test_image_data", "sourceLang": "en", "targetLang": "zh"}' \
  -w "状态码: %{http_code}, 响应时间: %{time_total}s\n"

# 测试4: 配置更新
echo "测试配置更新端点..."
curl -s -X POST $SERVER_URL/api/config \
  -H "Content-Type: application/json" \
  -d '{"translation": {"targetLang": "zh"}}' \
  -w "状态码: %{http_code}, 响应时间: %{time_total}s\n"

echo "✅ API测试完成"
```

## 📊 性能测试

### 并发测试
测试服务器处理多个同时请求的能力：

```bash
#!/bin/bash
# 并发注视数据测试
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/gaze \
    -H "Content-Type: application/json" \
    -d "{\"x\": $((100 + i)), \"y\": $((200 + i))}" &
done
wait
echo "并发测试完成"
```

### 负载测试
使用Apache Bench进行负载测试：

```bash
# 安装ab工具后运行
ab -n 1000 -c 10 http://localhost:3000/health
```

**期望结果**:
- 成功率 > 99%
- 平均响应时间 < 100ms
- 无内存泄漏

## 🐛 错误处理测试

### 测试无效请求
```bash
# 测试不支持的HTTP方法
curl -X DELETE http://localhost:3000/api/gaze

# 测试不存在的端点
curl -X GET http://localhost:3000/api/nonexistent

# 测试无效Content-Type
curl -X POST http://localhost:3000/api/gaze \
  -H "Content-Type: text/plain" \
  -d "invalid data"
```

### 期望错误响应
- 404状态码用于不存在的端点
- 400状态码用于无效请求数据
- 405状态码用于不支持的HTTP方法

## 📝 测试报告格式

```
API测试报告
==========
测试时间: [时间戳]
服务器版本: simple-server.js v1.0

端点测试结果:
✅ GET /health - 通过 (响应时间: 15ms)
✅ POST /api/gaze - 通过 (响应时间: 25ms) 
✅ POST /api/screenshot - 通过 (响应时间: 150ms)
✅ POST /api/config - 通过 (响应时间: 30ms)

性能测试结果:
- 并发处理: 10个请求同时处理正常
- 平均响应时间: 35ms
- 成功率: 100%

错误处理测试:
✅ 404错误正确返回
✅ 400错误正确返回
✅ JSON解析错误正确处理

总结:
所有API端点功能正常，性能满足要求。
```

## 🔧 调试工具推荐

### Postman集合
创建Postman测试集合，包含所有API端点的预配置请求。

### 服务器监控
监控服务器运行状态：
```bash
# 监控端口使用
netstat -tlnp | grep 3000

# 监控进程
ps aux | grep node

# 监控日志
tail -f server.log
```

## ✅ 测试检查清单

### 功能测试
- [ ] 所有端点返回正确状态码
- [ ] 响应数据格式正确
- [ ] 错误处理工作正常
- [ ] CORS头设置正确

### 性能测试  
- [ ] 响应时间在可接受范围内
- [ ] 并发请求处理正常
- [ ] 无内存泄漏
- [ ] 服务器稳定运行

### 安全测试
- [ ] 无SQL注入漏洞
- [ ] 输入验证正确
- [ ] 错误信息不泄露敏感信息

## 🎯 高级测试

完成基础API测试后，可进行：
1. **集成测试** - 与真实DeepL API集成
2. **压力测试** - 高并发场景测试
3. **安全测试** - 渗透测试和漏洞扫描
4. **监控集成** - 添加APM监控测试
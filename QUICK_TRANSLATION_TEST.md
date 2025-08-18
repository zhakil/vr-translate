# 🚀 快速翻译功能测试

## 📋 简化测试步骤

### 第1步：创建测试文本（2分钟）

在Unity中快速创建测试对象：

1. **右键Hierarchy → 3D Object → Text - TextMeshPro**
   - 名称：`TestText`
   - 位置：`(0, 0, 5)` - 相机前方
   - 文本：`Hello World`
   - 字体大小：`5`

2. **右键Hierarchy → Create Empty**
   - 名称：`TranslationTester`
   - 添加组件：`TranslationTester` 脚本

### 第2步：配置测试器

选中 **TranslationTester** GameObject：
- **Gaze Detector**: 拖拽 `GazeDetector` GameObject 到此字段

### 第3步：开始测试

1. **点击Play** ▶️
2. **按空格键** 或点击界面上的"📸 截图测试"按钮
3. **观察Console输出**

### 期待结果：

```
🧪 TranslationTester: 手动触发截图测试
📸 截图测试已触发 - 位置: (960, 540)
Screenshot sent to server.
Translation received successfully
```

## 🎮 测试快捷键

- **空格键**: 触发截图测试
- **C键**: 测试网络连接

## ✅ 成功标志

如果看到以下内容，说明翻译系统工作正常：
- ✅ Console显示截图发送成功
- ✅ 服务器接收POST请求
- ✅ 返回模拟翻译结果

## 🔧 如果出现问题

1. **检查连接**: 按C键测试连接
2. **检查引用**: 确保TranslationTester的GazeDetector字段已设置
3. **重启**: 停止Play模式，重新启动

**准备好了就开始测试吧！** 🎯
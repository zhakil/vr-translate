# Unity 包依赖修复指南

## 问题描述
Unity项目在拉取远程更新后出现包依赖版本不兼容错误。

## 解决方案

### 1. 关闭Unity编辑器
完全关闭Unity编辑器，确保没有Unity进程在运行。

### 2. 包版本已修复
已更新 `frontend/unity/Packages/manifest.json` 为兼容版本：
- Input System: 1.8.2 (从 1.14.3 降级)
- XR Core Utils: 2.2.3 (从 2.5.3 降级)  
- XR Interaction Toolkit: 3.0.5 (从 3.2.1 降级)
- XR Management: 4.4.0 (从 4.5.2 降级)
- OpenXR: 1.12.0 (从 1.15.2 降级)

### 3. 清理和重建步骤

#### 手动清理（Unity关闭时）：
```bash
cd frontend/unity
rmdir /s Library
rmdir /s Temp  
rmdir /s Logs
del Packages\packages-lock.json
```

#### 重新打开Unity：
1. 打开Unity Hub
2. 选择项目：`frontend/unity`
3. Unity会自动重新导入包
4. 等待Package Manager解析依赖

### 4. 验证修复
- 检查Console无错误信息
- Package Manager显示所有包为绿色状态
- 可以正常编译项目

### 5. 可选：添加Meta XR SDK
如果需要Meta Quest 3支持，在Package Manager中手动添加：
- Window → Package Manager
- + → Add package by name
- 名称：`com.meta.xr.sdk.core`
- 版本：选择最新稳定版

## 技术说明
- 使用Unity 2023 LTS兼容的包版本
- 移除了过新的77.0.0版本Meta XR SDK
- 添加了OpenUPM注册表支持Meta包

修复完成后，Unity项目应该可以正常编译和运行。
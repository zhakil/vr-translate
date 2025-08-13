@echo off
chcp 65001 >nul
title VR翻译OCR测试

echo 🚀 启动VR翻译OCR测试环境...

cd backend
start "DeepL服务器" /min "D:\node.exe" deepl-server.js

timeout /t 3 /nobreak >nul

cd ..
echo ✅ 正在打开测试页面...
echo 📝 请在浏览器中打开: http://localhost:3000/api/health 检查服务状态
echo 📝 然后打开: quest3-vr-ui.html 进行OCR翻译测试
echo 📝 或打开: test-ocr.html 进行简单测试

pause
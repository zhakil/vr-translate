@echo off
chcp 65001 >nul
title VR翻译服务器 - DeepL版本

cd backend
echo 🚀 启动支持DeepL的VR翻译服务器...
"D:\node.exe" deepl-server.js

pause
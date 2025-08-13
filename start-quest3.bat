@echo off
echo ==========================================
echo    VR翻译服务 - Quest 3启动脚本
echo ==========================================
echo.

echo 🚀 启动后端服务...
cd /d "%~dp0backend"
start "VR-Backend" cmd /c "npm start"

echo ⏳ 等待后端服务启动...
timeout /t 5 /nobreak

echo 🌐 启动HTTP文件服务器...
cd /d "%~dp0"
start "VR-FileServer" cmd /c "python -m http.server 8888"

echo ⏳ 等待文件服务器启动...
timeout /t 3 /nobreak

echo.
echo ✅ VR翻译服务已启动！
echo.
echo 📱 Quest 3访问地址:
echo    http://[你的电脑IP]:8888/quest3-vr-ui.html
echo.
echo 🔧 本地测试地址:
echo    http://127.0.0.1:8888/quest3-vr-ui.html
echo.
echo 📋 服务状态:
echo    - 后端API: http://localhost:3000/api
echo    - WebSocket: ws://localhost:8080  
echo    - 文件服务: http://127.0.0.1:8888
echo.
echo 💡 提示: 确保Quest 3与电脑在同一WiFi网络中
echo.
pause
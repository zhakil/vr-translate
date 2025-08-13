#!/bin/bash

# VR Translation Service - One-Click Startup Script
# 一键启动 VR 翻译服务

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Emojis
CHECK_MARK="✅"
CROSS_MARK="❌"
WARNING="⚠️ "
ROCKET="🚀"
GEAR="🔧"
BOOK="📖"
COMPUTER="💻"
DOCKER="🐳"
PACKAGE="📦"
BUILD="🏗️ "
STAR="🌟"

# Functions
log_info() {
    echo -e "${GREEN}${CHECK_MARK}${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}${WARNING}${NC} $1"
}

log_error() {
    echo -e "${RED}${CROSS_MARK}${NC} $1"
}

log_step() {
    echo -e "${BLUE}[$1] $2${NC}"
}

log_title() {
    echo -e "${PURPLE}$1${NC}"
}

# Main startup function
main() {
    clear
    
    log_title "========================================"
    log_title "   VR Translation Service Launcher"
    log_title "   VR 翻译服务启动器"
    log_title "========================================"
    echo

    # Check Node.js installation
    log_step "1/6" "检查 Node.js 安装..."
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装或未在 PATH 中"
        echo "请从 https://nodejs.org 下载并安装 Node.js"
        exit 1
    fi
    log_info "Node.js 已安装: $(node --version)"

    # Check Docker installation (optional)
    log_step "2/6" "检查 Docker 安装..."
    if ! command -v docker &> /dev/null; then
        log_warn "Docker 未安装 - 将使用本地开发模式"
        USE_DOCKER=false
    else
        log_info "Docker 已安装 - 可使用容器模式"
        USE_DOCKER=true
    fi

    # Setup configuration
    log_step "3/6" "配置环境..."
    if [ ! -f "backend/config/local.json" ]; then
        echo "${PACKAGE} 创建本地配置文件..."
        cp "backend/config/local.json.example" "backend/config/local.json"
        log_info "配置文件已创建"
    else
        log_info "配置文件已存在"
    fi

    # Install backend dependencies
    log_step "4/6" "安装后端依赖..."
    cd backend
    if [ ! -d "node_modules" ]; then
        echo "${PACKAGE} 安装 Node.js 依赖包..."
        npm install
        log_info "依赖安装完成"
    else
        log_info "依赖已安装，检查更新..."
        npm update
    fi

    # Build the project
    log_step "5/6" "构建项目..."
    echo "${BUILD}编译 TypeScript..."
    npm run build
    log_info "构建完成"
    cd ..

    # Start the service
    log_step "6/6" "启动服务..."
    echo
    echo "${ROCKET} 启动 VR 翻译服务..."
    echo
    echo "服务信息："
    echo "- HTTP API: http://localhost:8080"
    echo "- WebSocket: ws://localhost:8081"  
    echo "- DeepL API: 已预配置"
    echo

    if [ "$USE_DOCKER" = true ]; then
        echo "选择启动模式："
        echo "[1] Docker 容器模式 (推荐)"
        echo "[2] 本地开发模式"
        read -p "请选择模式 (1-2): " MODE
        
        if [ "$MODE" = "1" ]; then
            echo "${DOCKER} 使用 Docker 启动..."
            if docker-compose up -d; then
                log_info "Docker 服务已启动"
                show_status
                return
            else
                log_error "Docker 启动失败，切换到本地模式"
            fi
        fi
    fi

    # Local mode
    echo "${COMPUTER} 使用本地模式启动..."
    cd backend
    echo
    echo "${STAR} 服务正在启动，请勿关闭此终端..."
    echo "${RED}按 Ctrl+C 停止服务${NC}"
    echo
    npm run dev
}

show_status() {
    echo
    log_title "========================================"
    log_title "  ${ROCKET} VR 翻译服务启动完成！"
    log_title "========================================"
    echo
    echo "${BOOK} Unity 前端连接地址:"
    echo "   WebSocket: ws://localhost:8081"
    echo
    echo "${GEAR} API 端点:"
    echo "   Health Check: http://localhost:8080/health"
    echo "   API Docs: http://localhost:8080/api-docs"
    echo
    echo "${GEAR} 预配置服务:"
    echo "   ${CHECK_MARK} DeepL 翻译 (API Key 已设置)"
    echo "   ${CHECK_MARK} 头部朝向跟踪支持"
    echo "   ${CHECK_MARK} OCR 文本识别"
    echo
    echo "${BOOK} 使用说明:"
    echo "   1. 在 Unity 中打开 VR 翻译项目"
    echo "   2. 运行场景，系统将自动连接后端"
    echo "   3. 看向文字内容触发翻译"
    echo
    
    if [ "$USE_DOCKER" = true ]; then
        echo "${DOCKER} Docker 服务管理:"
        echo "   查看状态: docker-compose ps"
        echo "   查看日志: docker-compose logs -f"
        echo "   停止服务: docker-compose down"
        echo
    fi

    echo "按任意键退出..."
    read -n 1 -s
}

# Run main function
main "$@"
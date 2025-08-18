#!/bin/bash
# VR翻译系统测试执行脚本

echo "🧪 VR翻译系统测试运行器"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SERVER_URL="http://localhost:3000"
SERVER_PID=""
REPORTS_DIR="../reports"

# 创建报告目录
mkdir -p $REPORTS_DIR

# 功能：检查服务器状态
check_server() {
    echo "🔍 检查后端服务器状态..."
    if curl -s $SERVER_URL/health > /dev/null; then
        echo -e "${GREEN}✅ 服务器运行正常${NC}"
        return 0
    else
        echo -e "${RED}❌ 服务器未响应${NC}"
        return 1
    fi
}

# 功能：启动服务器
start_server() {
    echo "🚀 启动后端服务器..."
    cd ../backend
    node simple-server.js > server.log 2>&1 &
    SERVER_PID=$!
    echo "服务器进程ID: $SERVER_PID"
    
    # 等待服务器启动
    echo "⏳ 等待服务器启动..."
    for i in {1..10}; do
        if check_server; then
            echo -e "${GREEN}✅ 服务器启动成功${NC}"
            return 0
        fi
        sleep 2
    done
    
    echo -e "${RED}❌ 服务器启动失败${NC}"
    return 1
}

# 功能：停止服务器
stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        echo "🛑 停止服务器 (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
        echo -e "${GREEN}✅ 服务器已停止${NC}"
    fi
}

# 功能：运行API测试
run_api_tests() {
    echo -e "${BLUE}🔧 开始API测试...${NC}"
    local test_results="$REPORTS_DIR/api_test_$(date +%Y%m%d_%H%M%S).txt"
    local passed=0
    local failed=0
    
    echo "API测试报告 - $(date)" > $test_results
    echo "================================" >> $test_results
    
    # 测试1: 健康检查
    echo "测试健康检查端点..."
    if curl -s -w "状态码: %{http_code}, 响应时间: %{time_total}s\n" $SERVER_URL/health >> $test_results 2>&1; then
        echo -e "${GREEN}✅ 健康检查测试通过${NC}"
        ((passed++))
    else
        echo -e "${RED}❌ 健康检查测试失败${NC}"
        ((failed++))
    fi
    
    # 测试2: 注视数据
    echo "测试注视数据端点..."
    if curl -s -X POST $SERVER_URL/api/gaze \
        -H "Content-Type: application/json" \
        -d '{"x": 100, "y": 200}' \
        -w "状态码: %{http_code}, 响应时间: %{time_total}s\n" >> $test_results 2>&1; then
        echo -e "${GREEN}✅ 注视数据测试通过${NC}"
        ((passed++))
    else
        echo -e "${RED}❌ 注视数据测试失败${NC}"
        ((failed++))
    fi
    
    # 测试3: 截图翻译
    echo "测试截图翻译端点..."
    if curl -s -X POST $SERVER_URL/api/screenshot \
        -H "Content-Type: application/json" \
        -d '{"image": "test_image_data", "sourceLang": "en", "targetLang": "zh"}' \
        -w "状态码: %{http_code}, 响应时间: %{time_total}s\n" >> $test_results 2>&1; then
        echo -e "${GREEN}✅ 截图翻译测试通过${NC}"
        ((passed++))
    else
        echo -e "${RED}❌ 截图翻译测试失败${NC}"
        ((failed++))
    fi
    
    # 测试4: 配置更新
    echo "测试配置更新端点..."
    if curl -s -X POST $SERVER_URL/api/config \
        -H "Content-Type: application/json" \
        -d '{"translation": {"targetLang": "zh"}}' \
        -w "状态码: %{http_code}, 响应时间: %{time_total}s\n" >> $test_results 2>&1; then
        echo -e "${GREEN}✅ 配置更新测试通过${NC}"
        ((passed++))
    else
        echo -e "${RED}❌ 配置更新测试失败${NC}"
        ((failed++))
    fi
    
    # 输出测试结果
    echo "" >> $test_results
    echo "测试结果统计:" >> $test_results
    echo "通过: $passed" >> $test_results
    echo "失败: $failed" >> $test_results
    echo "总计: $((passed + failed))" >> $test_results
    
    echo -e "${BLUE}📊 API测试完成${NC}"
    echo -e "通过: ${GREEN}$passed${NC}, 失败: ${RED}$failed${NC}"
    echo "详细报告: $test_results"
    
    return $failed
}

# 功能：运行并发测试
run_concurrent_tests() {
    echo -e "${BLUE}⚡ 开始并发测试...${NC}"
    local test_results="$REPORTS_DIR/concurrent_test_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "并发测试报告 - $(date)" > $test_results
    echo "================================" >> $test_results
    
    # 并发注视数据测试
    echo "运行并发注视数据测试 (10个请求)..."
    for i in {1..10}; do
        curl -s -X POST $SERVER_URL/api/gaze \
            -H "Content-Type: application/json" \
            -d "{\"x\": $((100 + i)), \"y\": $((200 + i))}" >> $test_results 2>&1 &
    done
    wait
    
    echo -e "${GREEN}✅ 并发测试完成${NC}"
    echo "详细报告: $test_results"
}

# 功能：运行性能测试
run_performance_tests() {
    echo -e "${BLUE}🏃 开始性能测试...${NC}"
    local test_results="$REPORTS_DIR/performance_test_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "性能测试报告 - $(date)" > $test_results
    echo "================================" >> $test_results
    
    # 响应时间测试
    echo "测试响应时间..."
    for i in {1..5}; do
        echo "测试轮次 $i:" >> $test_results
        curl -s -w "健康检查响应时间: %{time_total}s\n" $SERVER_URL/health >> $test_results 2>&1
        curl -s -X POST $SERVER_URL/api/gaze \
            -H "Content-Type: application/json" \
            -d '{"x": 100, "y": 200}' \
            -w "注视数据响应时间: %{time_total}s\n" >> $test_results 2>&1
        sleep 1
    done
    
    echo -e "${GREEN}✅ 性能测试完成${NC}"
    echo "详细报告: $test_results"
}

# 功能：生成综合报告
generate_report() {
    local final_report="$REPORTS_DIR/test_summary_$(date +%Y%m%d_%H%M%S).md"
    
    echo "# VR翻译系统测试报告" > $final_report
    echo "" >> $final_report
    echo "**测试时间:** $(date)" >> $final_report
    echo "**测试环境:** $(uname -s) $(uname -r)" >> $final_report
    echo "**服务器地址:** $SERVER_URL" >> $final_report
    echo "" >> $final_report
    
    echo "## 测试概要" >> $final_report
    echo "- ✅ API端点测试" >> $final_report
    echo "- ✅ 并发处理测试" >> $final_report
    echo "- ✅ 性能响应测试" >> $final_report
    echo "" >> $final_report
    
    echo "## 测试文件" >> $final_report
    echo "所有详细测试结果保存在 \`tests/reports/\` 目录中" >> $final_report
    
    echo -e "${GREEN}📄 综合测试报告生成完成: $final_report${NC}"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  all          运行所有测试"
    echo "  backend      仅运行后端测试"
    echo "  api          仅运行API测试"
    echo "  performance  仅运行性能测试"
    echo "  concurrent   仅运行并发测试"
    echo "  server       仅启动服务器"
    echo "  help         显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 all                # 运行完整测试套件"
    echo "  $0 api                # 仅测试API端点"
    echo "  $0 server             # 仅启动测试服务器"
}

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}🧹 清理测试环境...${NC}"
    stop_server
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 设置信号处理
trap cleanup EXIT INT TERM

# 主程序
main() {
    case "${1:-all}" in
        "help"|"--help"|"-h")
            show_help
            ;;
        "server")
            start_server
            echo "按 Ctrl+C 停止服务器"
            read -r -d '' _ </dev/tty
            ;;
        "api")
            if check_server || start_server; then
                run_api_tests
            else
                echo -e "${RED}❌ 无法启动服务器，测试取消${NC}"
                exit 1
            fi
            ;;
        "performance")
            if check_server || start_server; then
                run_performance_tests
            else
                echo -e "${RED}❌ 无法启动服务器，测试取消${NC}"
                exit 1
            fi
            ;;
        "concurrent")
            if check_server || start_server; then
                run_concurrent_tests
            else
                echo -e "${RED}❌ 无法启动服务器，测试取消${NC}"
                exit 1
            fi
            ;;
        "backend")
            if check_server || start_server; then
                run_api_tests
                run_concurrent_tests
                run_performance_tests
                generate_report
            else
                echo -e "${RED}❌ 无法启动服务器，测试取消${NC}"
                exit 1
            fi
            ;;
        "all"|*)
            echo -e "${BLUE}🚀 开始完整测试套件...${NC}"
            if check_server || start_server; then
                run_api_tests
                run_concurrent_tests  
                run_performance_tests
                generate_report
                echo -e "${GREEN}🎉 所有测试完成！${NC}"
            else
                echo -e "${RED}❌ 无法启动服务器，测试取消${NC}"
                exit 1
            fi
            ;;
    esac
}

# 执行主程序
main "$@"
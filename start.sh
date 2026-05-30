#!/bin/bash

# Hybrid RAG 启动脚本

echo "=========================================="
echo "  Hybrid RAG 智能问答系统启动脚本"
echo "=========================================="

# 检查 .env 文件
if [ ! -f "backend/.env" ]; then
    echo "⚠️  未找到 backend/.env 文件"
    echo "正在从模板创建..."
    cp backend/.env.example backend/.env
    echo "请编辑 backend/.env 文件，填入您的 OpenAI API Key"
    echo "然后重新运行此脚本"
    exit 1
fi

# 启动后端
echo "🚀 启动后端服务..."
cd backend
uv run uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "🚀 启动前端服务..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "  ✅ 系统已启动！"
echo "=========================================="
echo ""
echo "  前端地址: http://localhost:5173"
echo "  后端地址: http://localhost:8000"
echo "  API 文档: http://localhost:8000/docs"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "=========================================="

# 捕获退出信号
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# 等待
wait

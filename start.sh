#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="${TMPDIR:-/tmp}/zhiyuan-knowledge-workspace"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

mkdir -p "$PID_DIR"

if [ ! -f "$ROOT_DIR/backend/.env" ]; then
    echo "⚠️  未找到 backend/.env"
    cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
    echo "已创建配置模板，请填写 API 配置后重新启动。"
    exit 1
fi

if [ ! -x "$ROOT_DIR/backend/.venv/bin/uvicorn" ]; then
    echo "⚠️  后端依赖未安装，请先运行: cd backend && uv sync"
    exit 1
fi

if [ ! -x "$ROOT_DIR/frontend/node_modules/.bin/vite" ]; then
    echo "⚠️  前端依赖未安装，请先运行: cd frontend && npm install"
    exit 1
fi

cleanup() {
    "$ROOT_DIR/stop.sh" >/dev/null 2>&1 || true
}

trap cleanup INT TERM EXIT

echo "🚀 启动知源文档知识工作台"

cd "$ROOT_DIR/backend"
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8002 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

cd "$ROOT_DIR/frontend"
./node_modules/.bin/vite --host 127.0.0.1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

echo ""
echo "前端地址: http://localhost:5175"
echo "后端地址: http://localhost:8002"
echo "API 文档: http://localhost:8002/docs"
echo "按 Ctrl+C 停止本项目服务"

wait "$BACKEND_PID" "$FRONTEND_PID"

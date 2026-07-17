#!/bin/bash

PID_DIR="${TMPDIR:-/tmp}/zhiyuan-knowledge-workspace"

stop_process() {
    local name="$1"
    local pid_file="$2"

    if [ ! -f "$pid_file" ]; then
        echo "• $name 未记录运行进程"
        return
    fi

    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        echo "✓ $name 已停止 (PID $pid)"
    else
        echo "• $name 已不在运行"
    fi
    rm -f "$pid_file"
}

stop_process "后端" "$PID_DIR/backend.pid"
stop_process "前端" "$PID_DIR/frontend.pid"

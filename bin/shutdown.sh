#!/bin/bash

# AI Paper Reader - Stop Both Backend and Frontend

# Get the project root directory (parent of bin dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/conf/config.yaml"

# Load ports from config file
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        BACKEND_PORT=$(grep -E "^\s*port:" "$CONFIG_FILE" | head -1 | awk '{print $2}' | tr -d '\r')
        FRONTEND_PORT=$(grep -E "^\s*port:" "$CONFIG_FILE" | tail -1 | awk '{print $2}' | tr -d '\r')
    fi

    # Fallback to defaults if not found
    BACKEND_PORT=${BACKEND_PORT:-8000}
    FRONTEND_PORT=${FRONTEND_PORT:-3000}
}

load_config

LOG_DIR="$PROJECT_ROOT/log"

echo "Stopping AI Paper Reader services..."
echo "Cleaning up log files..."

# Stop backend (by port)
echo "Stopping backend server..."
if lsof -ti:$BACKEND_PORT > /dev/null 2>&1; then
    PID=$(lsof -ti:$BACKEND_PORT)
    echo "Killing backend (PID: $PID)..."
    kill $PID 2>/dev/null
    sleep 1
    # Force kill if still running
    if lsof -ti:$BACKEND_PORT > /dev/null 2>&1; then
        pkill -9 -f "uvicorn" 2>/dev/null
    fi
else
    echo "No backend server found running on port $BACKEND_PORT."
fi

# Stop frontend (by port)
echo "Stopping frontend server..."
if lsof -ti:$FRONTEND_PORT > /dev/null 2>&1; then
    PIDS=$(lsof -ti:$FRONTEND_PORT)
    echo "Killing frontend (PIDs: $PIDS)..."
    echo "$PIDS" | xargs kill 2>/dev/null
    sleep 1
    # Force kill if still running
    if lsof -ti:$FRONTEND_PORT > /dev/null 2>&1; then
        pkill -9 -f "next" 2>/dev/null
    fi
else
    echo "No frontend server found running on port $FRONTEND_PORT."
fi

echo ""
echo "All services stopped."

# Clean up log files
echo "Cleaning up log files..."
rm -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
echo "Log files removed from $LOG_DIR"

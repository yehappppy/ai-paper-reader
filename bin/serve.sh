#!/bin/bash

# AI Paper Reader - Start Both Backend and Frontend

# Get the project root directory (parent of bin dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/conf/config.yaml"

BACKEND_DIR="$PROJECT_ROOT/apr_backend"
FRONTEND_DIR="$PROJECT_ROOT/apr_frontend"
LOG_DIR="$PROJECT_ROOT/log"

echo "Project root: $PROJECT_ROOT"
echo "Log directory: $LOG_DIR"

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

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        --backend-port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: ./bin/serve.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --port PORT       Set frontend port (default: $FRONTEND_PORT)"
            echo "  --backend-port PORT   Set backend port (default: $BACKEND_PORT)"
            echo "  --help                Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Backend port: $BACKEND_PORT"
echo "Frontend port: $FRONTEND_PORT"

# Start backend
echo "Starting backend server on port $BACKEND_PORT..."
cd "$BACKEND_DIR" || exit 1
./bin/serve.sh -p "$BACKEND_PORT"

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! lsof -ti:$BACKEND_PORT > /dev/null 2>&1; then
    echo "Warning: Backend may not have started correctly. Check logs."
fi

# Start frontend
echo "Starting frontend server on port $FRONTEND_PORT..."
cd "$FRONTEND_DIR" || exit 1

# Start frontend in background
nohup npm run dev -- -p "$FRONTEND_PORT" > "$LOG_DIR/frontend.log" 2>&1 &

# Wait for frontend to start
sleep 5

echo ""
echo "============================================"
echo "AI Paper Reader is now running!"
echo "============================================"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend:  http://localhost:$BACKEND_PORT"
echo ""
echo "To view backend logs: tail -f $LOG_DIR/backend.log"
echo "To view frontend logs: tail -f $LOG_DIR/frontend.log"
echo "To stop: ./bin/shutdown.sh"
echo "============================================"

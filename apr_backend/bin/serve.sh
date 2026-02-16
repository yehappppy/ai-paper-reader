#!/bin/bash

# AI Paper Reader - Backend Server Script

# Get the backend root directory (parent of bin dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_ROOT" || exit 1

echo "Backend root: $BACKEND_ROOT"

# Default values
PORT=8000
HOST="0.0.0.0"
RELOAD="--reload"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        --no-reload)
            RELOAD=""
            shift
            ;;
        -h|--help)
            echo "Usage: ./bin/serve.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --port PORT    Set server port (default: 8000)"
            echo "  -h, --host HOST   Set server host (default: 0.0.0.0)"
            echo "  --no-reload       Disable auto-reload on code changes"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Activate virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo "Virtual environment not found. Run ./bin/build_env.sh first."
    exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "No .env file found. Copying from .env.example..."
        cp .env.example .env
        echo "Please edit .env and add your API keys."
    fi
fi

LOG_FILE="../log/backend.log"

echo "Starting AI Paper Reader backend on $HOST:$PORT"
echo "Log file: $BACKEND_ROOT/../log/backend.log"
nohup uvicorn src.main:app --host "$HOST" --port "$PORT" $RELOAD > "$BACKEND_ROOT/../log/backend.log" 2>&1 &

echo "Server started with PID: $!"
echo "To view logs: tail -f $BACKEND_ROOT/../log/backend.log"
echo "To stop: ./bin/shutdown.sh"

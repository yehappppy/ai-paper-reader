#!/bin/bash

# AI Paper Reader - Shutdown Server Script

# Get the backend root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_ROOT" || exit 1

echo "Backend root: $BACKEND_ROOT"

# Find and kill the uvicorn process
PID=$(pgrep -f "uvicorn src.main:app")

if [ -z "$PID" ]; then
    echo "No running server found."
    exit 0
fi

echo "Stopping server (PID: $PID)..."
kill "$PID"

# Wait for process to terminate
sleep 2

# Check if still running
if pgrep -f "uvicorn src.main:app" > /dev/null; then
    echo "Process still running, forcing kill..."
    pkill -9 -f "uvicorn src.main:app"
fi

echo "Server stopped."

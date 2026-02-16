#!/bin/bash

# AI Paper Reader - Build Virtual Environment Script

# Get the backend root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_ROOT" || exit 1

echo "Backend root: $BACKEND_ROOT"

FORCE_CREATE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE_CREATE=true
            shift
            ;;
        -h|--help)
            echo "Usage: ./bin/build_env.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -f, --force      Force recreate virtual environment (removes existing .venv)"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Remove existing venv if -f is specified
if [ "$FORCE_CREATE" = true ]; then
    if [ -d ".venv" ]; then
        echo "Removing existing virtual environment..."
        rm -rf .venv
    fi
else
    if [ -d ".venv" ]; then
        echo "Virtual environment already exists at .venv"
        echo "Use -f to force recreate"
        exit 0
    fi
fi

# Create virtual environment
echo "Creating virtual environment with uv..."
uv venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
uv pip install -e .

echo "Virtual environment ready at .venv"

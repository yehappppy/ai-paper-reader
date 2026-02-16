# AI Paper Reader

A web application for reading and managing AI/ML research papers with PDF viewing, note-taking, and AI-powered features.

## Configuration

Ports are configured in `conf/config.yaml`:

```yaml
server:
  backend:
    port: 8000
  frontend:
    port: 3000
```

## Logs

Logs are stored in the `log/` directory:
- `log/backend.log` - Backend server logs
- `log/frontend.log` - Frontend server logs

Logs are automatically deleted when running `./bin/shutdown.sh`.

## Quick Start

### Starting the Application

Run the development servers for both backend and frontend:

```bash
./bin/serve.sh
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

#### Options

- `-p, --port PORT` - Set frontend port (default: 3000)
- `--backend-port PORT` - Set backend port (default: 8000)

### Stopping the Application

```bash
./bin/shutdown.sh
```

## Manual Setup

### Backend

```bash
cd apr_backend

# Create virtual environment
./bin/build_env.sh

# Start server
./bin/serve.sh
```

### Frontend

```bash
cd apr_frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

Create a `.env` file in `apr_backend/` with your API keys. See `.env.example` for required variables.

# AI Paper Reader - Frontend

A premium Next.js frontend for reading AI papers (PDFs), taking notes in Markdown, and querying an AI assistant for explanations.

## Features

- **Dashboard**: Clean, minimalist home page with paper thumbnails in a responsive grid
- **PDF Viewer**: Full-featured PDF viewer with zoom, navigation, and rotation
- **Notes Editor**: Monaco-based Markdown editor with live preview and auto-save
- **AI Assistant**: Chat interface powered by the backend API for paper explanations
- **Apple Design**: Clean macOS/iOS aesthetic with SF Pro typography, glassmorphism, and smooth animations

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Animations**: Framer Motion
- **PDF Rendering**: react-pdf
- **Code Editor**: @monaco-editor/react
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running at http://localhost:8000

### Installation

```bash
cd apr_frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:3000

### Build

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Dashboard (home)
│   ├── globals.css        # Global styles
│   └── reader/            # Reader pages
│       ├── layout.tsx
│       └── [paperId]/    # Dynamic paper reader
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── reader/            # PDF viewer components
│   ├── notes/             # Notes editor components
│   ├── ai/                # AI assistant components
│   └── common/            # Shared components
├── lib/
│   ├── api/               # API wrappers
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── hooks/                 # Custom React hooks
└── store/                 # Zustand stores
```

## Keyboard Shortcuts

- `Cmd+K` - Focus AI assistant input
- `Cmd+S` - Save notes (when editor focused)

## License

MIT

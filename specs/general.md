# General.md

This file provides guidance for LLMs working with code in this repository.

## Project Overview

Sabacc Online is a multiplayer card game implementation based on the Star Wars universe Sabacc card game, specifically the Coruscant Shift variant. It uses Node.js, TypeScript, React, and Socket.IO for real-time multiplayer functionality.

## Development Setup

### Initial Setup

```bash
# Install all dependencies (root and client)
npm run install-all

# Copy environment variables
cp .env.example .env
```

### Development Commands

```bash
# Run both server and client in development mode
npm run dev

# Run only the server
npm run server

# Run only the client
npm run client

# Build for production
npm run build

# Start production server (after build)
npm start
```

### Client Commands (from /client directory)

```bash
# Install client dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build client for production
npm run build

# Preview production build
npm run preview
```

## Ports and URLs

- **Backend Server**: http://localhost:3001
- **Frontend Client**: http://localhost:5173
- **Health Check**: http://localhost:3001/health

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sabacc Online is a multiplayer card game implementation based on the Star Wars universe Sabacc card game. It uses Node.js, TypeScript, React, and Socket.IO for real-time multiplayer functionality.

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

## Project Architecture

### Backend (Node.js + TypeScript + Socket.IO)
- **Server**: Express server with Socket.IO for real-time communication
- **Game Logic**: Sabacc game rules and state management
- **Structure**:
  - `src/server/index.ts` - Main server entry point
  - `src/game/GameManager.ts` - Manages multiple game instances
  - `src/game/SabaccGame.ts` - Individual game logic
  - `src/types/game.ts` - Shared type definitions

### Frontend (React + TypeScript + Vite)
- **Client**: React application with Socket.IO client
- **Real-time**: Custom hook for Socket.IO connection
- **Structure**:
  - `client/src/App.tsx` - Main application component
  - `client/src/components/GameBoard.tsx` - Game interface
  - `client/src/hooks/useSocket.ts` - Socket.IO connection hook
  - `client/src/types/game.ts` - Shared type definitions

### Game Features
- Real-time multiplayer gameplay
- Sabacc card game mechanics (closest to 23 wins)
- Four suits: sabers, flasks, coins, staves
- Betting system with credits
- Game phases: waiting, betting, playing, finished
- Room-based game sessions

## Ports and URLs
- **Backend Server**: http://localhost:3001
- **Frontend Client**: http://localhost:5173
- **Health Check**: http://localhost:3001/health

## Development Notes
- TypeScript is used throughout the project for type safety
- Socket.IO handles real-time communication between client and server
- Game state is synchronized across all connected players
- Uses Vite for fast frontend development and building
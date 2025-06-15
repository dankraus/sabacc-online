# Sabacc Online - Architecture Specification

## Technology Stack

### Frontend

- **Framework**: React
- **Styling**: Tailwind CSS
- **State Management**: React Context API (for local state)
- **Real-time Communication**: Socket.IO Client

### Backend

- **Server**: Node.js with Express
- **Real-time Communication**: Socket.IO Server
- **Game Logic**: Server-side implementation
- **State Management**: In-memory game state (with potential for Redis integration for scaling)

## Architecture Overview

### Client-Server Model

- All game logic will be implemented on the server side to prevent cheating
- Client will only handle UI rendering and user interactions
- Real-time updates will be managed through Socket.IO events

### Game State Management

1. **Server-side State**

   - Player hands
   - Deck state
   - Game phase
   - Player actions
   - Game rules enforcement

2. **Client-side State**
   - UI state
   - Local player information
   - Game view state

### Real-time Communication

Socket.IO events will be used for:

- Game state updates
- Player actions
- Turn management
- Chat functionality
- Player presence

### Security Considerations

- All game logic must be server-side
- Client-side code should not have access to other players' hands
- Input validation on both client and server
- Rate limiting for actions
- Session management

## UI/UX Guidelines

### Design Principles

- Simple and clean interface
- Clear game state visibility
- Intuitive player actions
- Responsive design for multiple screen sizes

### Key UI Components

1. Game Table

   - Player positions
   - Card display areas
   - Action buttons
   - Game status

2. Player Interface
   - Hand display
   - Action controls
   - Game information
   - Chat interface

## Development Guidelines

### Code Organization

```
src/
├── client/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   └── utils/
├── server/
│   ├── game/
│   ├── events/
│   ├── middleware/
│   └── utils/
└── shared/
    └── types/
```

### Best Practices

1. **Type Safety**

   - Use TypeScript for both client and server
   - Define shared types for game state and events

2. **Testing**

   - Jest as the primary testing framework
   - Testing levels:
     - Unit tests for game logic and utility functions
     - Integration tests for socket events and API endpoints
     - Component tests for React UI elements
     - End-to-end tests for critical user flows
   - Test coverage requirements:
     - Minimum 80% coverage for game logic
     - Minimum 70% coverage for UI components
     - All critical game flows must have E2E tests
   - Testing tools:
     - Jest for test runner and assertions
     - React Testing Library for component testing
     - MSW (Mock Service Worker) for API mocking
     - Socket.IO testing utilities for real-time event testing

3. **Code Quality**
   - ESLint for code style
   - Prettier for formatting
   - Git hooks for pre-commit checks

## Deployment Considerations

### Development

- Local development environment
- Hot reloading for both client and server
- Mock game state for testing

### Production

- Containerized deployment
- Environment configuration
- Monitoring and logging
- Scaling considerations for multiple game rooms

## Future Considerations

- Database integration for persistent game state
- User authentication and profiles
- Game history and statistics
- Spectator mode
- Tournament support

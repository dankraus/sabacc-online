# Implementation Requirements

## Core Features

### Game Management

- Anonymous play with player names
- Game ID-based joining system
- 2-6 players per game
- No lobby system - direct game ID entry
- In-memory game state only (no persistence)
- Full Coruscant Shift rules including tournament rules

### User Interface

- Chat system
- Card movement animations
- Dice roll animations
- Tutorial mode (future implementation)

### Technical Stack

- Frontend:

  - React + TypeScript
  - Tailwind CSS
  - Socket.IO Client
  - React Router
  - UI Component Library (shadcn/ui)
  - Framer Motion for animations

- Backend:
  - Node.js + Express
  - Socket.IO Server
  - TypeScript

### Socket.IO Event Naming Convention

- All Socket.IO events should use past tense verbs
- Examples:
  - `playerJoined` instead of `joinPlayer`
  - `gameStarted` instead of `startGame`
  - `cardsSelected` instead of `selectCards`
- This convention helps indicate that events represent completed actions

### Testing

- Jest for testing
- Test coverage requirements:
  - 80% for game logic
  - 70% for UI components
- No TDD requirement, but tests should be created during implementation
- **Testing Rule**: Tests must be written immediately after implementing any new feature or component
- Test categories:
  - Unit tests for individual functions and classes
  - Integration tests for Socket.IO events and game flow
  - Component tests for React UI elements
  - End-to-end tests for critical user flows

## Implementation Decisions

### Authentication & User Management

- No authentication system
- Anonymous play only
- Players can declare their name before playing

### Game State

- In-memory state only
- No database integration
- No persistence between sessions

### Error Handling

- Basic error handling
- No specific reconnection mechanism
- No specific disconnection handling

### Performance & Accessibility

- No specific performance requirements
- No specific accessibility requirements
- Local development environment only

### Deployment

- Local development only
- Production deployment to be determined later

## Project Structure

```
src/
├── client/
│   ├── components/
│   │   ├── game/
│   │   ├── chat/
│   │   └── ui/
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

## Implementation Phases

1. Set up the basic server with Socket.IO
2. Create the game state management system
3. Implement the basic UI components
4. Add the game logic
5. Implement the chat system
6. Add animations

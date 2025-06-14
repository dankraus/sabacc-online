# Test Suite

This directory contains comprehensive tests for the Sabacc Online server.

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── helpers/
│   └── testUtils.ts            # Test utilities and helper functions
├── unit/
│   ├── SabaccGame.test.ts      # Game logic tests
│   └── GameManager.test.ts     # Game manager tests
└── integration/
    ├── server.test.ts          # Express server integration tests
    └── socket.test.ts          # Socket.IO integration tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### CI Mode (for automated testing)
```bash
npm run test:ci
```

## Test Coverage

The test suite covers:

### Unit Tests
- **SabaccGame**: Game logic, card deck management, player actions, betting, hand calculation
- **GameManager**: Game creation, player management, event handling, multi-game support

### Integration Tests
- **Server**: Express endpoints, CORS, error handling, JSON parsing
- **Socket.IO**: Real-time event handling, game flows, multi-client scenarios

## Test Utilities

### TestServer
Helper class for creating Socket.IO test servers:
```typescript
const testServer = new TestServer(3003);
await testServer.start();
// ... tests
await testServer.stop();
```

### TestClient
Helper class for Socket.IO client connections:
```typescript
const client = new TestClient('http://localhost:3003');
await client.connect();
client.emit('join-game', { gameId: 'test', playerName: 'Alice' });
const gameState = await client.waitForEvent('game-state-update');
```

### Mock Factories
- `createMockPlayer()`: Creates mock player objects
- `createMockCard()`: Creates mock card objects  
- `createMockGameState()`: Creates mock game state objects

### Utilities
- `waitFor()`: Waits for conditions to be met
- `waitForEvent()`: Waits for specific Socket.IO events

## Configuration

Jest configuration is in `jest.config.js`:
- TypeScript support via ts-jest
- Test timeout: 10 seconds
- Coverage collection from src/ directory
- Setup file: tests/setup.ts

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on others
2. **Cleanup**: Proper cleanup of connections and resources
3. **Mocking**: External dependencies are mocked appropriately
4. **Assertions**: Clear, specific assertions with meaningful error messages
5. **Coverage**: Comprehensive coverage of both happy paths and error cases

## Troubleshooting

### Common Issues

1. **Port conflicts**: Tests use port 3003 by default
2. **Timeout errors**: Increase timeout for slow operations
3. **Connection issues**: Ensure proper cleanup of Socket.IO connections
4. **Mock issues**: Clear mocks between tests with `jest.clearAllMocks()`
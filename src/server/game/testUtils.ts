import { GameEventEmitter } from './GameEventEmitter';

/**
 * Creates a mock GameEventEmitter with all methods mocked as jest functions.
 * This eliminates duplication across test files.
 */
export const createMockEventEmitter = (): jest.Mocked<GameEventEmitter> => {
    const mockEmitter = {
        emitGameStateUpdated: jest.fn(),
        emitPlayerJoined: jest.fn(),
        emitPlayerLeft: jest.fn(),
        emitErrorOccurred: jest.fn(),
        emitErrorToGame: jest.fn(),
        emitChatMessageReceived: jest.fn(),
        emitBettingPhaseStarted: jest.fn(),
        emitPlayerActed: jest.fn(),
        emitBettingPhaseCompleted: jest.fn(),
        emitGameStarted: jest.fn(),
        emitDiceRolled: jest.fn(),
        emitCardsSelected: jest.fn(),
        emitCardsImproved: jest.fn(),
        emitRoundEnded: jest.fn(),
        emitGameEnded: jest.fn(),
        emitToRoom: jest.fn(),
        emitToSocket: jest.fn(),
        emitGameStateAndPlayerJoined: jest.fn(),
        emitGameStateAndPlayerLeft: jest.fn(),
        emitGameStateAndBettingPhaseStarted: jest.fn(),
        emitGameStateAndPlayerActed: jest.fn(),
        emitGameStateAndBettingPhaseCompleted: jest.fn(),
        emitGameStateAndDiceRolled: jest.fn(),
        emitGameStateAndCardsSelected: jest.fn(),
        emitGameStateAndCardsImproved: jest.fn(),
        emitGameStateAndRoundEnded: jest.fn(),
        emitGameStateAndGameEnded: jest.fn()
    };

    return mockEmitter as unknown as jest.Mocked<GameEventEmitter>;
}; 
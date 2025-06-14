import { GameManager } from '../../src/game/GameManager';
import { Server, Socket } from 'socket.io';
import { createMockGameState } from '../helpers/testUtils';

// Mock Socket.IO
const mockSocket = {
  id: 'socket-123',
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis()
} as unknown as Socket;

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as unknown as Server;

// Mock SabaccGame
jest.mock('../../src/game/SabaccGame');
import { SabaccGame } from '../../src/game/SabaccGame';

const MockSabaccGame = SabaccGame as jest.MockedClass<typeof SabaccGame>;

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockGame: jest.Mocked<SabaccGame>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock game instance
    mockGame = {
      addPlayer: jest.fn(),
      removePlayer: jest.fn(),
      placeBet: jest.fn(),
      drawCard: jest.fn(),
      stand: jest.fn(),
      getGameState: jest.fn(),
      getPlayerCount: jest.fn(),
      isGameOver: jest.fn(),
      getWinner: jest.fn()
    } as any;

    MockSabaccGame.mockImplementation(() => mockGame);
    
    gameManager = new GameManager(mockIo);
  });

  describe('Join Game', () => {
    it('should create new game if it does not exist', () => {
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());

      gameManager.joinGame(mockSocket, 'game-123', 'Alice');

      expect(MockSabaccGame).toHaveBeenCalledWith('game-123', mockIo);
      expect(mockGame.addPlayer).toHaveBeenCalledWith('socket-123', 'Alice');
      expect(mockSocket.join).toHaveBeenCalledWith('game-123');
    });

    it('should join existing game', () => {
      // First player creates the game
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());
      gameManager.joinGame(mockSocket, 'game-123', 'Alice');

      // Second player joins existing game
      const mockSocket2 = { ...mockSocket, id: 'socket-456' } as unknown as Socket;
      gameManager.joinGame(mockSocket2, 'game-123', 'Bob');

      // Should not create new game instance
      expect(MockSabaccGame).toHaveBeenCalledTimes(1);
      expect(mockGame.addPlayer).toHaveBeenCalledTimes(2);
      expect(mockGame.addPlayer).toHaveBeenLastCalledWith('socket-456', 'Bob');
    });

    it('should emit game state update on successful join', () => {
      const gameState = createMockGameState({ id: 'game-123' });
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(gameState);

      gameManager.joinGame(mockSocket, 'game-123', 'Alice');

      expect(mockSocket.emit).toHaveBeenCalledWith('game-state-update', gameState);
      expect(mockSocket.to).toHaveBeenCalledWith('game-123');
    });

    it('should emit error when join fails', () => {
      mockGame.addPlayer.mockReturnValue(false);

      gameManager.joinGame(mockSocket, 'game-123', 'Alice');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { 
        message: 'Failed to join game. Game may be full.' 
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle join errors gracefully', () => {
      mockGame.addPlayer.mockImplementation(() => {
        throw new Error('Game error');
      });

      gameManager.joinGame(mockSocket, 'game-123', 'Alice');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { 
        message: 'An error occurred while joining the game.' 
      });
    });
  });

  describe('Leave Game', () => {
    beforeEach(() => {
      // Setup a game with a player
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());
      gameManager.joinGame(mockSocket, 'game-123', 'Alice');
      jest.clearAllMocks();
    });

    it('should remove player from game', () => {
      mockGame.getPlayerCount.mockReturnValue(1);
      mockGame.getGameState.mockReturnValue(createMockGameState());

      gameManager.leaveGame(mockSocket);

      expect(mockGame.removePlayer).toHaveBeenCalledWith('socket-123');
      expect(mockSocket.leave).toHaveBeenCalledWith('game-123');
    });

    it('should delete empty games', () => {
      mockGame.getPlayerCount.mockReturnValue(0);

      gameManager.leaveGame(mockSocket);

      expect(mockGame.removePlayer).toHaveBeenCalledWith('socket-123');
      // Game should be deleted from internal map (we can't directly test this)
    });

    it('should emit game state update to remaining players', () => {
      mockGame.getPlayerCount.mockReturnValue(1);
      const updatedGameState = createMockGameState({ players: [] });
      mockGame.getGameState.mockReturnValue(updatedGameState);

      gameManager.leaveGame(mockSocket);

      expect(mockSocket.to).toHaveBeenCalledWith('game-123');
    });

    it('should handle leave when player not in game', () => {
      const newSocket = { ...mockSocket, id: 'socket-999' } as unknown as Socket;
      
      gameManager.leaveGame(newSocket);

      // Should not throw error or call game methods
      expect(mockGame.removePlayer).not.toHaveBeenCalled();
    });
  });

  describe('Place Bet', () => {
    beforeEach(() => {
      // Setup a game with a player
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());
      gameManager.joinGame(mockSocket, 'game-123', 'Alice');
      jest.clearAllMocks();
    });

    it('should place bet successfully', () => {
      mockGame.placeBet.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());

      gameManager.placeBet(mockSocket, 100);

      expect(mockGame.placeBet).toHaveBeenCalledWith('socket-123', 100);
      expect(mockIo.to).toHaveBeenCalledWith('game-123');
    });

    it('should emit error on invalid bet', () => {
      mockGame.placeBet.mockReturnValue(false);

      gameManager.placeBet(mockSocket, 100);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { 
        message: 'Invalid bet amount.' 
      });
    });

    it('should handle bet from player not in game', () => {
      const newSocket = { ...mockSocket, id: 'socket-999' } as unknown as Socket;
      
      gameManager.placeBet(newSocket, 100);

      expect(mockGame.placeBet).not.toHaveBeenCalled();
    });
  });

  describe('Draw Card', () => {
    beforeEach(() => {
      // Setup a game with a player
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());
      gameManager.joinGame(mockSocket, 'game-123', 'Alice');
      jest.clearAllMocks();
    });

    it('should draw card successfully', () => {
      mockGame.drawCard.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());

      gameManager.drawCard(mockSocket);

      expect(mockGame.drawCard).toHaveBeenCalledWith('socket-123');
      expect(mockIo.to).toHaveBeenCalledWith('game-123');
    });

    it('should emit error when draw fails', () => {
      mockGame.drawCard.mockReturnValue(false);

      gameManager.drawCard(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { 
        message: 'Cannot draw card at this time.' 
      });
    });
  });

  describe('Stand', () => {
    beforeEach(() => {
      // Setup a game with a player
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());
      gameManager.joinGame(mockSocket, 'game-123', 'Alice');
      jest.clearAllMocks();
    });

    it('should allow player to stand', () => {
      mockGame.stand.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());
      mockGame.isGameOver.mockReturnValue(false);

      gameManager.stand(mockSocket);

      expect(mockGame.stand).toHaveBeenCalledWith('socket-123');
      expect(mockIo.to).toHaveBeenCalledWith('game-123');
    });

    it('should emit game over when game ends', () => {
      const finalGameState = createMockGameState({ phase: 'finished' });
      const winner = { id: 'socket-123', name: 'Alice' };
      
      mockGame.stand.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(finalGameState);
      mockGame.isGameOver.mockReturnValue(true);
      mockGame.getWinner.mockReturnValue(winner as any);

      gameManager.stand(mockSocket);

      expect(mockIo.to).toHaveBeenCalledWith('game-123');
      expect(mockIo.emit).toHaveBeenCalledWith('game-over', {
        winner: 'Alice',
        finalState: finalGameState
      });
    });

    it('should handle game over with no winner', () => {
      const finalGameState = createMockGameState({ phase: 'finished' });
      
      mockGame.stand.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(finalGameState);
      mockGame.isGameOver.mockReturnValue(true);
      mockGame.getWinner.mockReturnValue(null);

      gameManager.stand(mockSocket);

      expect(mockIo.emit).toHaveBeenCalledWith('game-over', {
        winner: 'No winner',
        finalState: finalGameState
      });
    });
  });

  describe('Handle Disconnect', () => {
    it('should call leaveGame on disconnect', () => {
      // Setup a game with a player
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());
      gameManager.joinGame(mockSocket, 'game-123', 'Alice');
      
      // Spy on leaveGame method
      const leaveGameSpy = jest.spyOn(gameManager, 'leaveGame');
      
      gameManager.handleDisconnect(mockSocket);

      expect(leaveGameSpy).toHaveBeenCalledWith(mockSocket);
    });
  });

  describe('Multiple Games Management', () => {
    it('should manage multiple games independently', () => {
      const socket1 = { ...mockSocket, id: 'socket-1' } as unknown as Socket;
      const socket2 = { ...mockSocket, id: 'socket-2' } as unknown as Socket;
      
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());

      // Create two different games
      gameManager.joinGame(socket1, 'game-1', 'Alice');
      gameManager.joinGame(socket2, 'game-2', 'Bob');

      // Should create two separate game instances
      expect(MockSabaccGame).toHaveBeenCalledTimes(2);
      expect(MockSabaccGame).toHaveBeenCalledWith('game-1', mockIo);
      expect(MockSabaccGame).toHaveBeenCalledWith('game-2', mockIo);
    });

    it('should track players across games correctly', () => {
      const socket1 = { ...mockSocket, id: 'socket-1' } as unknown as Socket;
      const socket2 = { ...mockSocket, id: 'socket-2' } as unknown as Socket;
      
      mockGame.addPlayer.mockReturnValue(true);
      mockGame.getGameState.mockReturnValue(createMockGameState());
      mockGame.getPlayerCount.mockReturnValue(1);

      // Join different games
      gameManager.joinGame(socket1, 'game-1', 'Alice');
      gameManager.joinGame(socket2, 'game-2', 'Bob');

      // Leave games
      gameManager.leaveGame(socket1);
      gameManager.leaveGame(socket2);

      // Both should leave their respective games
      expect(mockGame.removePlayer).toHaveBeenCalledWith('socket-1');
      expect(mockGame.removePlayer).toHaveBeenCalledWith('socket-2');
    });
  });
});
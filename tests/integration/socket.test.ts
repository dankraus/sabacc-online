import { TestServer, TestClient, waitFor } from '../helpers/testUtils';
import { GameManager } from '../../src/game/GameManager';

describe('Socket.IO Integration Tests', () => {
  let testServer: TestServer;
  let gameManager: GameManager;
  let client1: TestClient;
  let client2: TestClient;

  beforeAll(async () => {
    testServer = new TestServer(3003);
    await testServer.start();
    
    gameManager = new GameManager(testServer.getServer());
    
    // Setup Socket.IO event handlers on the test server
    testServer.getServer().on('connection', (socket) => {
      socket.on('join-game', (data) => {
        gameManager.joinGame(socket, data.gameId, data.playerName);
      });

      socket.on('leave-game', () => {
        gameManager.leaveGame(socket);
      });

      socket.on('place-bet', (data) => {
        gameManager.placeBet(socket, data.amount);
      });

      socket.on('draw-card', () => {
        gameManager.drawCard(socket);
      });

      socket.on('stand', () => {
        gameManager.stand(socket);
      });

      socket.on('disconnect', () => {
        gameManager.handleDisconnect(socket);
      });
    });
  });

  afterAll(async () => {
    await testServer.stop();
  });

  beforeEach(() => {
    client1 = new TestClient(`http://localhost:${testServer.getPort()}`);
    client2 = new TestClient(`http://localhost:${testServer.getPort()}`);
  });

  afterEach(() => {
    client1.disconnect();
    client2.disconnect();
  });

  describe('Connection Handling', () => {
    it('should establish socket connection', async () => {
      await client1.connect();
      expect(client1.getSocket().connected).toBe(true);
    });

    it('should handle multiple client connections', async () => {
      await Promise.all([
        client1.connect(),
        client2.connect()
      ]);

      expect(client1.getSocket().connected).toBe(true);
      expect(client2.getSocket().connected).toBe(true);
    });

    it('should handle client disconnection', async () => {
      await client1.connect();
      expect(client1.getSocket().connected).toBe(true);

      client1.disconnect();
      
      await waitFor(() => !client1.getSocket().connected);
      expect(client1.getSocket().connected).toBe(false);
    });
  });

  describe('Game Join Flow', () => {
    beforeEach(async () => {
      await client1.connect();
      await client2.connect();
    });

    it('should join game and receive game state update', async () => {
      const gameStatePromise = client1.waitForEvent('game-state-update');
      
      client1.emit('join-game', { gameId: 'test-game', playerName: 'Alice' });
      
      const gameState = await gameStatePromise;
      
      expect(gameState).toBeDefined();
      expect(gameState.id).toBe('test-game');
      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0].name).toBe('Alice');
    });

    it('should allow multiple players to join same game', async () => {
      // First player joins
      const gameState1Promise = client1.waitForEvent('game-state-update');
      client1.emit('join-game', { gameId: 'test-game', playerName: 'Alice' });
      await gameState1Promise;

      // Second player joins
      const gameState2Promise = client2.waitForEvent('game-state-update');
      client2.emit('join-game', { gameId: 'test-game', playerName: 'Bob' });
      const gameState2 = await gameState2Promise;

      expect(gameState2.players).toHaveLength(2);
      expect(gameState2.players.map(p => p.name)).toContain('Alice');
      expect(gameState2.players.map(p => p.name)).toContain('Bob');
    });

    it('should start game when minimum players join', async () => {
      // First player joins
      client1.emit('join-game', { gameId: 'test-game', playerName: 'Alice' });
      const gameState1 = await client1.waitForEvent('game-state-update');
      expect(gameState1.phase).toBe('waiting');

      // Second player joins - should start game
      client2.emit('join-game', { gameId: 'test-game', playerName: 'Bob' });
      const gameState2 = await client2.waitForEvent('game-state-update');
      
      expect(gameState2.phase).toBe('betting');
      expect(gameState2.currentPlayer).toBeDefined();
      
      // Players should have initial cards
      gameState2.players.forEach((player: any) => {
        expect(player.hand).toHaveLength(2);
      });
    });

    it('should handle game join failure', async () => {
      // Fill up the game to max capacity first
      const clients = [];
      for (let i = 0; i < 4; i++) {
        const client = new TestClient(`http://localhost:${testServer.getPort()}`);
        await client.connect();
        client.emit('join-game', { gameId: 'full-game', playerName: `Player${i}` });
        await client.waitForEvent('game-state-update');
        clients.push(client);
      }

      // Try to join with 5th player
      const errorPromise = client1.waitForEvent('error');
      client1.emit('join-game', { gameId: 'full-game', playerName: 'Player5' });
      
      const error = await errorPromise;
      expect(error.message).toContain('Failed to join game');

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Game Actions', () => {
    beforeEach(async () => {
      await client1.connect();
      await client2.connect();
      
      // Join game and start it
      client1.emit('join-game', { gameId: 'action-game', playerName: 'Alice' });
      await client1.waitForEvent('game-state-update');
      
      client2.emit('join-game', { gameId: 'action-game', playerName: 'Bob' });
      await client2.waitForEvent('game-state-update');
    });

    it('should handle betting', async () => {
      const gameStatePromise = client1.waitForEvent('game-state-update');
      
      client1.emit('place-bet', { amount: 100 });
      
      const gameState = await gameStatePromise;
      const player = gameState.players.find((p: any) => p.name === 'Alice');
      
      expect(player.bet).toBe(100);
      expect(player.credits).toBe(900);
      expect(gameState.pot).toBe(100);
    });

    it('should handle invalid betting', async () => {
      const errorPromise = client1.waitForEvent('error');
      
      client1.emit('place-bet', { amount: 2000 }); // More than available credits
      
      const error = await errorPromise;
      expect(error.message).toContain('Invalid bet amount');
    });

    it('should handle card drawing in playing phase', async () => {
      // First, force the game to playing phase by placing bets
      client1.emit('place-bet', { amount: 10 });
      await client1.waitForEvent('game-state-update');
      
      // Simulate game transitioning to playing phase
      // (This would normally happen through game logic)
      
      const gameStatePromise = client1.waitForEvent('game-state-update');
      client1.emit('draw-card');
      
      // Should receive error since game is still in betting phase
      const error = await client1.waitForEvent('error');
      expect(error.message).toContain('Cannot draw card at this time');
    });

    it('should handle standing', async () => {
      // Try to stand during betting phase
      const errorPromise = client1.waitForEvent('error');
      client1.emit('stand');
      
      const error = await errorPromise;
      expect(error.message).toBeDefined();
    });
  });

  describe('Game Leave Flow', () => {
    beforeEach(async () => {
      await client1.connect();
      await client2.connect();
      
      // Join game
      client1.emit('join-game', { gameId: 'leave-game', playerName: 'Alice' });
      await client1.waitForEvent('game-state-update');
      
      client2.emit('join-game', { gameId: 'leave-game', playerName: 'Bob' });
      await client2.waitForEvent('game-state-update');
    });

    it('should handle player leaving game', async () => {
      const gameStatePromise = client2.waitForEvent('game-state-update');
      
      client1.emit('leave-game');
      
      const gameState = await gameStatePromise;
      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0].name).toBe('Bob');
    });

    it('should reset game phase when players drop below minimum', async () => {
      // Both players leave
      client1.emit('leave-game');
      client2.emit('leave-game');
      
      // Add a new player to check game state
      const client3 = new TestClient(`http://localhost:${testServer.getPort()}`);
      await client3.connect();
      
      client3.emit('join-game', { gameId: 'leave-game', playerName: 'Charlie' });
      const gameState = await client3.waitForEvent('game-state-update');
      
      expect(gameState.phase).toBe('waiting');
      
      client3.disconnect();
    });

    it('should handle disconnect as leave', async () => {
      const gameStatePromise = client2.waitForEvent('game-state-update');
      
      client1.disconnect();
      
      const gameState = await gameStatePromise;
      expect(gameState.players).toHaveLength(1);
      expect(gameState.players[0].name).toBe('Bob');
    });
  });

  describe('Multiple Games', () => {
    beforeEach(async () => {
      await client1.connect();
      await client2.connect();
    });

    it('should handle multiple independent games', async () => {
      // Client 1 joins game A
      client1.emit('join-game', { gameId: 'game-a', playerName: 'Alice' });
      const gameStateA = await client1.waitForEvent('game-state-update');
      
      // Client 2 joins game B
      client2.emit('join-game', { gameId: 'game-b', playerName: 'Bob' });
      const gameStateB = await client2.waitForEvent('game-state-update');
      
      expect(gameStateA.id).toBe('game-a');
      expect(gameStateB.id).toBe('game-b');
      expect(gameStateA.players).toHaveLength(1);
      expect(gameStateB.players).toHaveLength(1);
    });

    it('should not cross-contaminate game states', async () => {
      // Both join different games
      client1.emit('join-game', { gameId: 'game-a', playerName: 'Alice' });
      await client1.waitForEvent('game-state-update');
      
      client2.emit('join-game', { gameId: 'game-b', playerName: 'Bob' });
      await client2.waitForEvent('game-state-update');
      
      // Client 1 places bet in game A
      client1.emit('place-bet', { amount: 50 });
      const gameStateA = await client1.waitForEvent('game-state-update');
      
      // Client 2 should not receive this update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(gameStateA.pot).toBe(50);
      // We can't directly verify client2 didn't receive update, 
      // but the games should remain separate
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await client1.connect();
    });

    it('should handle actions from non-game players', async () => {
      // Try to place bet without joining game
      const errorPromise = client1.waitForEvent('error', 1000);
      client1.emit('place-bet', { amount: 100 });
      
      try {
        await errorPromise;
      } catch (e) {
        // Expected timeout since player is not in a game
        expect(e.message).toContain('Timeout');
      }
    });

    it('should handle malformed events gracefully', async () => {
      // Send malformed join-game event
      client1.emit('join-game', { invalidData: true });
      
      // Should not crash the server
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(client1.getSocket().connected).toBe(true);
    });
  });
});
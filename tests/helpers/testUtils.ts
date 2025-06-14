import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { GameEvents } from '../../src/types/game';

export class TestServer {
  private httpServer: any;
  private io: Server<GameEvents>;
  private port: number;

  constructor(port: number = 3002) {
    this.port = port;
    this.httpServer = createServer();
    this.io = new Server<GameEvents>(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close();
      this.httpServer.close(() => {
        resolve();
      });
    });
  }

  getServer(): Server<GameEvents> {
    return this.io;
  }

  getPort(): number {
    return this.port;
  }
}

export class TestClient {
  private socket: ClientSocket;
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.socket = Client(serverUrl, {
      autoConnect: false
    });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.connect();
      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', (error) => reject(error));
    });
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  getSocket(): ClientSocket {
    return this.socket;
  }

  emit(event: string, data?: any): void {
    this.socket.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.socket.on(event, callback);
  }

  once(event: string, callback: (...args: any[]) => void): void {
    this.socket.once(event, callback);
  }

  waitForEvent(event: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      this.socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
}

export function createMockPlayer(overrides: any = {}) {
  return {
    id: 'player-123',
    name: 'Test Player',
    credits: 1000,
    hand: [],
    bet: 0,
    isDealer: false,
    isConnected: true,
    ...overrides
  };
}

export function createMockCard(overrides: any = {}) {
  return {
    id: 'sabers-1',
    suit: 'sabers' as const,
    value: 1,
    name: '1 of sabers',
    ...overrides
  };
}

export function createMockGameState(overrides: any = {}) {
  return {
    id: 'game-123',
    players: [],
    currentPlayer: '',
    phase: 'waiting' as const,
    pot: 0,
    deck: [],
    maxPlayers: 4,
    ...overrides
  };
}

// Helper to wait for a condition to be true
export function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}
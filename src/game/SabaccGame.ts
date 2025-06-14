import { Server } from 'socket.io';
import { Card, Player, GameState, GameEvents } from '../types/game';

export class SabaccGame {
  private players: Map<string, Player> = new Map();
  private gameState: GameState;
  private deck: Card[] = [];

  constructor(private gameId: string, private io: Server<GameEvents>) {
    this.gameState = {
      id: gameId,
      players: [],
      currentPlayer: '',
      phase: 'waiting',
      pot: 0,
      deck: [],
      maxPlayers: 4
    };
    this.initializeDeck();
  }

  private initializeDeck(): void {
    const suits: Card['suit'][] = ['sabers', 'flasks', 'coins', 'staves'];
    this.deck = [];

    suits.forEach(suit => {
      for (let value = 1; value <= 11; value++) {
        this.deck.push({
          id: `${suit}-${value}`,
          suit,
          value,
          name: `${value} of ${suit}`
        });
      }
    });

    // Add face cards (value -10, -11, -12, -13, -14, -15)
    suits.forEach(suit => {
      const faceCards = ['Commander', 'Mistress', 'Master', 'Ace'];
      faceCards.forEach((name, index) => {
        this.deck.push({
          id: `${suit}-face-${index}`,
          suit,
          value: -(10 + index),
          name: `${name} of ${suit}`
        });
      });
    });

    this.shuffleDeck();
  }

  private shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  addPlayer(playerId: string, name: string): boolean {
    if (this.players.size >= this.gameState.maxPlayers) {
      return false;
    }

    const player: Player = {
      id: playerId,
      name,
      credits: 1000,
      hand: [],
      bet: 0,
      isDealer: this.players.size === 0,
      isConnected: true
    };

    this.players.set(playerId, player);
    this.updateGameState();

    if (this.players.size >= 2 && this.gameState.phase === 'waiting') {
      this.startGame();
    }

    return true;
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.updateGameState();

    if (this.players.size < 2 && this.gameState.phase !== 'waiting') {
      this.gameState.phase = 'waiting';
    }
  }

  placeBet(playerId: string, amount: number): boolean {
    const player = this.players.get(playerId);
    if (!player || amount > player.credits || amount <= 0) {
      return false;
    }

    player.bet = amount;
    player.credits -= amount;
    this.gameState.pot += amount;
    this.updateGameState();

    return true;
  }

  drawCard(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || this.gameState.phase !== 'playing' || this.deck.length === 0) {
      return false;
    }

    const card = this.deck.pop()!;
    player.hand.push(card);
    this.updateGameState();

    return true;
  }

  stand(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || this.gameState.phase !== 'playing') {
      return false;
    }

    // Player stands - no more actions for this player this round
    this.updateGameState();
    return true;
  }

  private startGame(): void {
    this.gameState.phase = 'betting';
    this.gameState.currentPlayer = Array.from(this.players.keys())[0];
    
    // Deal initial cards
    this.players.forEach(player => {
      for (let i = 0; i < 2; i++) {
        if (this.deck.length > 0) {
          player.hand.push(this.deck.pop()!);
        }
      }
    });

    this.updateGameState();
  }

  private calculateHandValue(hand: Card[]): number {
    return hand.reduce((sum, card) => sum + card.value, 0);
  }

  getWinner(): Player | null {
    if (this.players.size === 0) return null;

    let bestPlayer: Player | null = null;
    let bestScore = -Infinity;

    this.players.forEach(player => {
      const handValue = this.calculateHandValue(player.hand);
      const sabaccScore = Math.abs(handValue - 23);
      
      if (sabaccScore < Math.abs(bestScore - 23)) {
        bestPlayer = player;
        bestScore = handValue;
      }
    });

    return bestPlayer;
  }

  isGameOver(): boolean {
    return this.gameState.phase === 'finished';
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  private updateGameState(): void {
    this.gameState.players = Array.from(this.players.values());
    this.gameState.deck = []; // Don't expose deck to clients
  }

  getGameState(): GameState {
    return {
      ...this.gameState,
      players: this.gameState.players.map(player => ({
        ...player,
        hand: player.hand // In a real game, you might hide other players' hands
      }))
    };
  }
}
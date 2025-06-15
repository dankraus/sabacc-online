# Coruscant Shift Implementation Roadmap

## Completed Features

- Basic game setup and player management
- Deck creation with correct card distribution
- Basic game state management
- Player joining/leaving functionality
- Basic game phases tracking
- Dice rolling system
- Card selection mechanics
- Basic scoring system
- **Betting system with folding, ante, pot management, and validation (fully tested)**

## Next Implementation Steps

### 1. Betting System

- [x] Add betting methods to handle antes and bets
- [x] Implement betting rounds
- [x] Handle folding mechanics
- [x] Add pot management
- [x] Implement betting validation
- [x] Add comprehensive tests for betting system

### 2. Card Improvement Phase

- [x] Add methods to handle card improvement
- [x] Implement card selection validation
- [x] Handle discarding after improvement
- [ ] Add UI for card improvement phase

### 3. Tiebreaker System

- [x] Implement the chance cube mechanic
- [x] Add methods for handling ties
- [x] Implement the highest card draw for ties
- [ ] Add UI for tiebreaker scenarios

### 4. Chip Management

- [x] Add initial chip distribution (100 chips per player)
- [x] Implement ante system (5 credits per round)
- [x] Add pot management
- [x] Implement chip transfers for winners
- [ ] Add UI for chip display and management

### 5. Client-Side Implementation

- [ ] Create UI components for:
  - [ ] Dice display
  - [ ] Card selection interface
  - [ ] Betting interface
  - [ ] Game phase indicators
  - [ ] Player status display
  - [ ] Hand display
  - [ ] Selected cards display
  - [ ] Pot display
  - [ ] Player chips display

### 6. Testing

- [x] Unit tests for betting system
- [ ] Unit tests for game mechanics (other phases)
- [ ] Integration tests for game flow
- [ ] End-to-end tests for complete game scenarios
- [ ] UI component tests

### 7. Documentation

- [ ] API documentation
- [ ] Game rules documentation
- [ ] Setup instructions
- [ ] Deployment guide

## Notes

- Each feature should be implemented with proper error handling
- All game mechanics should follow the rules specified in `specs/coruscant-shift-game-rules.md`
- UI components should be responsive and user-friendly
- Testing should cover edge cases and error scenarios

## Rules Update

- The game does NOT start automatically when the minimum number of players is reached.
- Only the dealer (the first player or designated dealer) can start the game.
- Players may join while the game is in the waiting/setup phase.
- The dealer starts the game when ready, at which point hands are dealt and the round begins.
- Players must ante 5 credits to start playing and continue playing each round.
- The game ends after each player has dealt once, with the player having the most chips winning.

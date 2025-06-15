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

## Next Implementation Steps

### 1. Betting System

- [ ] Add betting methods to handle antes and bets
- [ ] Implement betting rounds
- [ ] Handle folding mechanics
- [ ] Add pot management
- [ ] Implement betting validation

### 2. Card Improvement Phase

- [ ] Add methods to handle card improvement
- [ ] Implement card selection validation
- [ ] Handle discarding after improvement
- [ ] Add UI for card improvement phase

### 3. Tiebreaker System

- [ ] Implement the chance cube mechanic
- [ ] Add methods for handling ties
- [ ] Implement the highest card draw for ties
- [ ] Add UI for tiebreaker scenarios

### 4. Tournament Rules

- [ ] Add chip management
- [ ] Implement antes
- [ ] Add round tracking
- [ ] Implement tournament end conditions

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

- [ ] Unit tests for game mechanics
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

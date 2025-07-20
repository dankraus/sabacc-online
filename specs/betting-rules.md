# Simplified Betting Rules Specification

## Overview

This specification defines the simplified continue/fold betting system for Coruscant Shift. The system replaces the complex poker-style betting with a straightforward pass/fold mechanic.

## Core Betting Mechanics

### Betting Actions

1. **Continue Playing**

   - Cost: 2 chips (fixed, non-configurable)
   - Action: Player stays in the current round
   - Effect: 2 chips added to pot, player remains active

2. **Fold**
   - Cost: Loses ante (5 chips already paid)
   - Action: Player exits the current round
   - Effect: Player becomes inactive, cards discarded, ante lost

### Betting Phase Flow

1. **Phase Initiation**

   - Betting phase starts automatically when all players have selected cards
   - `bettingPhaseStarted` flag set to true
   - `currentPlayer` set to dealer (first to act)

2. **Betting Order**

   - Dealer acts first
   - Then clockwise around the table
   - Folded players are skipped in subsequent rounds
   - Only active players can act

3. **Phase Completion**
   - Phase ends when all active players have made their choice
   - `bettingPhaseComplete` flag set to true
   - Game automatically transitions to next phase

### Data Structure Changes

#### GameState Updates

```typescript
interface GameState {
  // ... existing fields ...
  continueCost: number; // Always 2
  bettingRoundComplete: boolean;
  bettingPhaseStarted: boolean;
}
```

#### Player Updates

```typescript
interface Player {
  // ... existing fields ...
  hasActed: boolean; // Track if player has acted this betting phase
  bettingAction: "continue" | "fold" | null; // Track their choice
}
```

### Implementation Requirements

#### Phase 1: Data Structure Updates

1. **Update GameState Interface**

   - Add `continueCost: number` (set to 2)
   - Add `bettingRoundComplete: boolean`
   - Add `bettingPhaseStarted: boolean`

2. **Update Player Interface**

   - Add `hasActed: boolean`
   - Add `bettingAction: 'continue' | 'fold' | null`

3. **Add Betting Action Types**
   - Create enum: `BettingAction = 'continue' | 'fold'`
   - Create interface for betting action results

#### Phase 2: Core Betting Logic

4. **Implement Betting Phase Management**

   - Add `startBettingPhase()` method
   - Add `getNextPlayerToAct()` method
   - Add `isBettingPhaseComplete()` method

5. **Implement Betting Actions**

   - Replace `placeBet()` with `continuePlaying()` method
   - Update `fold()` method for new system
   - Add comprehensive validation

6. **Add Betting Validation**
   - Validate only current player can act
   - Validate player hasn't already acted
   - Validate sufficient chips for continue action
   - Validate betting phase is active

#### Phase 3: Game Flow Integration

7. **Update Game Phases**

   - Modify `first_betting` phase
   - Modify `improve` phase
   - Add automatic phase transitions

8. **Update GameManager Methods**
   - Modify `selectCards()` to start betting phase
   - Modify `handleSabaccShift()` to start betting phase
   - Update `endRound()` to reset betting state
   - Remove/deprecate old `placeBet()` method

#### Phase 4: Testing

9. **Create Comprehensive Betting Tests**

   - Test betting phase initialization
   - Test betting order (dealer first, clockwise)
   - Test continue action (2 chips, adds to pot)
   - Test fold action (loses ante, discards cards)
   - Test betting phase completion
   - Test validation rules

10. **Update Existing Tests**
    - Modify existing betting tests
    - Remove old `placeBet()` tests
    - Add edge case testing

#### Phase 5: Cleanup

11. **Remove Unused Code**

    - Remove/deprecate `placeBet()` method
    - Remove unused betting-related code
    - Clean up unused fields/methods

12. **Update Documentation**
    - Update comments and documentation
    - Ensure game rules match implementation

### Error Handling

1. **Disconnections**

   - Disconnected players auto-fold
   - Their ante is lost, cards discarded

2. **Insufficient Chips**

   - Players with < 2 chips cannot continue
   - Must fold or be auto-folded

3. **Invalid Actions**
   - Wrong player acting: throw error
   - Already acted: throw error
   - Wrong phase: throw error

### Pot Management

1. **Pot Sources**

   - Initial ante: 5 chips per player
   - Continue actions: 2 chips per continue
   - Total pot = sum of all antes + continues

2. **Pot Distribution**
   - Winner takes entire pot
   - Folded players lose their contributions

### Testing Requirements

1. **Unit Tests**

   - Betting phase initialization
   - Betting order validation
   - Action validation
   - Phase completion logic

2. **Integration Tests**

   - Complete betting phase flow
   - Phase transitions
   - Pot calculation
   - Error scenarios

3. **Edge Cases**
   - All players fold
   - Single player continues
   - Disconnection scenarios
   - Insufficient chips scenarios

### Socket.IO Events

1. **New Events**

   - `bettingPhaseStarted` - When betting phase begins
   - `playerActed` - When a player makes their choice
   - `bettingPhaseCompleted` - When all players have acted

2. **Updated Events**
   - `gameStateUpdated` - Include new betting fields
   - `playerFolded` - Updated for new system

### Migration Notes

1. **Backward Compatibility**

   - Old `placeBet()` method should be deprecated
   - Existing tests may need updates
   - Game state structure changes require client updates

2. **Breaking Changes**
   - `placeBet()` method removal
   - GameState interface changes
   - Player interface changes

## Success Criteria

1. **Functional Requirements**

   - Betting phases work correctly
   - Proper betting order maintained
   - Correct chip calculations
   - Automatic phase transitions

2. **Quality Requirements**

   - 80% test coverage for betting logic
   - All validation rules enforced
   - Error handling comprehensive
   - Code follows project conventions

3. **Performance Requirements**
   - No performance degradation
   - Efficient betting phase management
   - Minimal memory overhead

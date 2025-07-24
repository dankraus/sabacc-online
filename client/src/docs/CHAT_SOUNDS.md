# Chat Sound Effects

This document describes the sound effects implementation for the chat functionality in the Sabacc Online game.

## Overview

The chat system now includes sound effects that play when:

- A user sends a message (send sound)
- A user receives a message from another player (receive sound)

## Features

### Sound Toggle

- Users can enable/disable sound effects using the toggle button in the chat header
- The toggle shows 🔊 ON when enabled and 🔇 OFF when disabled
- The state is maintained during the session

### Sound Management

- Sounds are preloaded when the chat component mounts
- Volume is set to 30% by default to avoid being too loud
- Error handling ensures the app continues to work even if sound files are missing

## Implementation

### SoundManager Utility

The `SoundManager` class provides a centralized way to manage sound effects:

```typescript
import { soundManager } from "../utils/soundManager";

// Load chat sounds
await soundManager.loadChatSounds();

// Play sounds
await soundManager.playChatSend();
await soundManager.playChatReceive();

// Control settings
soundManager.setEnabled(false); // Disable sounds
soundManager.setVolume(0.5); // Set volume to 50%
```

### ChatWindow Integration

The `ChatWindow` component automatically:

- Loads sound files on mount
- Syncs the sound toggle state with the sound manager
- Plays appropriate sounds when messages are sent/received

## Required Sound Files

Place the following files in `client/public/sounds/`:

- `chat-send.wav` - Sound for sending messages
- `chat-receive.mp3` - Sound for receiving messages

### Sound Guidelines

- Keep sounds short (0.5-1 second)
- Use subtle, non-jarring sounds
- Ensure they're appropriate for a gaming environment
- Consider using royalty-free sounds

## Browser Compatibility

The sound system uses the Web Audio API and should work in all modern browsers. If sounds fail to load or play, the application will continue to function normally with console warnings.

## Testing

The sound functionality is thoroughly tested with:

- Unit tests for the SoundManager utility
- Integration tests for the ChatWindow component
- Mocked audio API for reliable test execution

## Future Enhancements

Potential improvements could include:

- Volume slider for fine-tuned control
- Different sound themes
- Sound effects for other game events
- User preference persistence across sessions

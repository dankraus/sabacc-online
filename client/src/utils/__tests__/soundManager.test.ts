import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import SoundManager from '../soundManager'

// Mock the Audio API
const mockAudio = {
    volume: 0.3,
    currentTime: 0,
    preload: 'auto',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
}

global.Audio = vi.fn(() => mockAudio) as any

describe('SoundManager', () => {
    let soundManager: SoundManager

    beforeEach(() => {
        vi.clearAllMocks()
        soundManager = new SoundManager()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('constructor', () => {
        it('creates instance with default values', () => {
            const manager = new SoundManager()
            expect(manager.isEnabled()).toBe(true)
            expect(manager.getVolume()).toBe(0.3)
        })

        it('creates instance with custom config', () => {
            const manager = new SoundManager({ enabled: false, volume: 0.5 })
            expect(manager.isEnabled()).toBe(false)
            expect(manager.getVolume()).toBe(0.5)
        })
    })

    describe('loadSound', () => {
        it('loads sound successfully', async () => {
            const loadPromise = soundManager.loadSound('test', '/test.mp3')

            // Simulate successful load
            const canplaythroughCallback = mockAudio.addEventListener.mock.calls.find(
                call => call[0] === 'canplaythrough'
            )?.[1]

            canplaythroughCallback?.()

            await loadPromise

            expect(mockAudio.volume).toBe(0.3)
            expect(mockAudio.preload).toBe('auto')
            expect(mockAudio.load).toHaveBeenCalled()
        })

        it('handles load errors', async () => {
            const loadPromise = soundManager.loadSound('test', '/test.mp3')

            // Simulate error
            const errorCallback = mockAudio.addEventListener.mock.calls.find(
                call => call[0] === 'error'
            )?.[1]

            errorCallback?.(new Error('Load failed'))

            await expect(loadPromise).rejects.toThrow('Failed to load sound test: Error: Load failed')
        })
    })

    describe('playSound', () => {
        beforeEach(async () => {
            // Load a test sound first
            const loadPromise = soundManager.loadSound('test', '/test.mp3')
            const canplaythroughCallback = mockAudio.addEventListener.mock.calls.find(
                call => call[0] === 'canplaythrough'
            )?.[1]
            canplaythroughCallback?.()
            await loadPromise
        })

        it('plays sound when enabled', async () => {
            await soundManager.playSound('test')

            expect(mockAudio.currentTime).toBe(0)
            expect(mockAudio.play).toHaveBeenCalled()
        })

        it('does not play sound when disabled', async () => {
            soundManager.setEnabled(false)

            await soundManager.playSound('test')

            expect(mockAudio.play).not.toHaveBeenCalled()
        })

        it('handles play errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
            mockAudio.play.mockRejectedValueOnce(new Error('Play failed'))

            await soundManager.playSound('test')

            expect(consoleSpy).toHaveBeenCalledWith('Failed to play sound test:', expect.any(Error))

            consoleSpy.mockRestore()
        })

        it('warns when sound not found', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

            await soundManager.playSound('nonexistent')

            expect(consoleSpy).toHaveBeenCalledWith('Sound nonexistent not found')

            consoleSpy.mockRestore()
        })
    })

    describe('volume control', () => {
        it('sets volume correctly', () => {
            soundManager.setVolume(0.5)
            expect(soundManager.getVolume()).toBe(0.5)
        })

        it('clamps volume to valid range', () => {
            soundManager.setVolume(1.5) // Above max
            expect(soundManager.getVolume()).toBe(1)

            soundManager.setVolume(-0.5) // Below min
            expect(soundManager.getVolume()).toBe(0)
        })

        it('updates volume for loaded sounds', async () => {
            // Load a test sound
            const loadPromise = soundManager.loadSound('test', '/test.mp3')
            const canplaythroughCallback = mockAudio.addEventListener.mock.calls.find(
                call => call[0] === 'canplaythrough'
            )?.[1]
            canplaythroughCallback?.()
            await loadPromise

            // Set new volume
            soundManager.setVolume(0.7)

            expect(mockAudio.volume).toBe(0.7)
        })
    })

    describe('enabled state', () => {
        it('sets enabled state correctly', () => {
            soundManager.setEnabled(false)
            expect(soundManager.isEnabled()).toBe(false)

            soundManager.setEnabled(true)
            expect(soundManager.isEnabled()).toBe(true)
        })
    })

    describe('chat sounds', () => {
        it('loads chat sounds', async () => {
            const loadPromise = soundManager.loadChatSounds()

            // Simulate successful loads
            const canplaythroughCallbacks = mockAudio.addEventListener.mock.calls
                .filter(call => call[0] === 'canplaythrough')
                .map(call => call[1])

            canplaythroughCallbacks.forEach(callback => callback?.())

            await loadPromise

            expect(mockAudio.load).toHaveBeenCalledTimes(2)
        })

        it('handles chat sound load errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

            const loadPromise = soundManager.loadChatSounds()

            // Simulate error for one sound
            const errorCallbacks = mockAudio.addEventListener.mock.calls
                .filter(call => call[0] === 'error')
                .map(call => call[1])

            errorCallbacks[0]?.(new Error('Load failed'))

            await loadPromise

            expect(consoleSpy).toHaveBeenCalledWith('Failed to load some chat sounds:', expect.any(Error))

            consoleSpy.mockRestore()
        })

        it('plays chat send sound', async () => {
            // Load the sound first
            const loadPromise = soundManager.loadChatSounds()
            const canplaythroughCallbacks = mockAudio.addEventListener.mock.calls
                .filter(call => call[0] === 'canplaythrough')
                .map(call => call[1])
            canplaythroughCallbacks.forEach(callback => callback?.())
            await loadPromise

            await soundManager.playChatSend()

            expect(mockAudio.play).toHaveBeenCalled()
        })

        it('plays chat receive sound', async () => {
            // Load the sound first
            const loadPromise = soundManager.loadChatSounds()
            const canplaythroughCallbacks = mockAudio.addEventListener.mock.calls
                .filter(call => call[0] === 'canplaythrough')
                .map(call => call[1])
            canplaythroughCallbacks.forEach(callback => callback?.())
            await loadPromise

            await soundManager.playChatReceive()

            expect(mockAudio.play).toHaveBeenCalled()
        })
    })
}) 
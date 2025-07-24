interface SoundConfig {
    volume?: number
    enabled?: boolean
}

class SoundManager {
    private sounds: Map<string, HTMLAudioElement> = new Map()
    private enabled: boolean = true
    private volume: number = 0.3

    constructor(config: SoundConfig = {}) {
        this.enabled = config.enabled ?? true
        this.volume = config.volume ?? 0.3
    }

    /**
     * Load a sound file
     */
    loadSound(name: string, src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const audio = new Audio(src)
            audio.volume = this.volume
            audio.preload = 'auto'

            audio.addEventListener('canplaythrough', () => {
                this.sounds.set(name, audio)
                resolve()
            }, { once: true })

            audio.addEventListener('error', (error) => {
                console.error(`Failed to load sound ${name} from ${src}:`, error)
                reject(new Error(`Failed to load sound ${name}: ${error}`))
            }, { once: true })

            audio.load()
        })
    }

    /**
     * Play a sound
     */
    async playSound(name: string): Promise<void> {
        if (!this.enabled) {
            return
        }

        const sound = this.sounds.get(name)
        if (!sound) {
            console.warn(`Sound ${name} not found`)
            return
        }

        try {
            // Reset the audio to the beginning in case it's already playing
            sound.currentTime = 0
            await sound.play()
        } catch (error) {
            console.warn(`Failed to play sound ${name}:`, error)
        }
    }

    /**
     * Set the volume for all sounds
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume))
        this.sounds.forEach(sound => {
            sound.volume = this.volume
        })
    }

    /**
     * Enable or disable sounds
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled
    }

    /**
     * Get current enabled state
     */
    isEnabled(): boolean {
        return this.enabled
    }

    /**
     * Get current volume
     */
    getVolume(): number {
        return this.volume
    }

    /**
     * Preload all chat sounds
     */
    async loadChatSounds(): Promise<void> {
        try {
            await Promise.all([
                this.loadSound('chat-send', '/sounds/chat-send.wav'),
                this.loadSound('chat-receive', '/sounds/chat-receive.mp3')
            ])
        } catch (error) {
            console.warn('Failed to load some chat sounds:', error)
        }
    }

    /**
     * Play chat send sound
     */
    playChatSend(): Promise<void> {
        return this.playSound('chat-send')
    }

    /**
     * Play chat receive sound
     */
    playChatReceive(): Promise<void> {
        return this.playSound('chat-receive')
    }
}

// Create a singleton instance
export const soundManager = new SoundManager()

export default SoundManager 
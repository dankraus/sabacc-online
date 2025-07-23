import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { ClientToServerEvents, ServerToClientEvents } from '../../../src/shared/types/game'

// Create a properly typed socket
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface UseGameSocketOptions {
    onConnect?: () => void
    onConnectError?: (error: any) => void
    onGameStateUpdated?: ServerToClientEvents['gameStateUpdated']
    onGameStarted?: ServerToClientEvents['gameStarted']
    onErrorOccurred?: ServerToClientEvents['errorOccurred']
    onPlayerJoined?: ServerToClientEvents['playerJoined']
    onPlayerLeft?: ServerToClientEvents['playerLeft']
    onChatMessageReceived?: ServerToClientEvents['chatMessageReceived']
    onBettingPhaseStarted?: ServerToClientEvents['bettingPhaseStarted']
    onPlayerActed?: ServerToClientEvents['playerActed']
    onBettingPhaseCompleted?: ServerToClientEvents['bettingPhaseCompleted']
    onDiceRolled?: ServerToClientEvents['diceRolled']
    onCardsSelected?: ServerToClientEvents['cardsSelected']
    onCardsImproved?: ServerToClientEvents['cardsImproved']
    onRoundEnded?: ServerToClientEvents['roundEnded']
    onGameEnded?: ServerToClientEvents['gameEnded']
}

export function useGameSocket(options: UseGameSocketOptions = {}) {
    const socketRef = useRef<TypedSocket | null>(null)

    // Create socket connection
    const connect = useCallback(() => {
        if (socketRef.current?.connected) {
            return socketRef.current
        }

        const socket = io() as TypedSocket
        socketRef.current = socket
        return socket
    }, [])

    // Disconnect socket
    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect()
            socketRef.current = null
        }
    }, [])

    // Emit function with TypeScript type safety
    const emit = useCallback(<K extends keyof ClientToServerEvents>(
        event: K,
        ...args: Parameters<ClientToServerEvents[K]>
    ) => {
        if (socketRef.current) {
            socketRef.current.emit(event, ...args)
        }
    }, [])

    // Setup event listeners
    useEffect(() => {
        const socket = socketRef.current
        if (!socket) return

        // Register all event listeners
        if (options.onConnect) {
            socket.on('connect', options.onConnect)
        }
        if (options.onConnectError) {
            socket.on('connect_error', options.onConnectError)
        }
        if (options.onGameStateUpdated) {
            socket.on('gameStateUpdated', options.onGameStateUpdated)
        }
        if (options.onGameStarted) {
            socket.on('gameStarted', options.onGameStarted)
        }
        if (options.onErrorOccurred) {
            socket.on('errorOccurred', options.onErrorOccurred)
        }
        if (options.onPlayerJoined) {
            socket.on('playerJoined', options.onPlayerJoined)
        }
        if (options.onPlayerLeft) {
            socket.on('playerLeft', options.onPlayerLeft)
        }
        if (options.onChatMessageReceived) {
            socket.on('chatMessageReceived', options.onChatMessageReceived)
        }
        if (options.onBettingPhaseStarted) {
            socket.on('bettingPhaseStarted', options.onBettingPhaseStarted)
        }
        if (options.onPlayerActed) {
            socket.on('playerActed', options.onPlayerActed)
        }
        if (options.onBettingPhaseCompleted) {
            socket.on('bettingPhaseCompleted', options.onBettingPhaseCompleted)
        }
        if (options.onDiceRolled) {
            socket.on('diceRolled', options.onDiceRolled)
        }
        if (options.onCardsSelected) {
            socket.on('cardsSelected', options.onCardsSelected)
        }
        if (options.onCardsImproved) {
            socket.on('cardsImproved', options.onCardsImproved)
        }
        if (options.onRoundEnded) {
            socket.on('roundEnded', options.onRoundEnded)
        }
        if (options.onGameEnded) {
            socket.on('gameEnded', options.onGameEnded)
        }

        // Cleanup function
        return () => {
            if (options.onConnect) {
                socket.off('connect', options.onConnect)
            }
            if (options.onConnectError) {
                socket.off('connect_error', options.onConnectError)
            }
            if (options.onGameStateUpdated) {
                socket.off('gameStateUpdated', options.onGameStateUpdated)
            }
            if (options.onGameStarted) {
                socket.off('gameStarted', options.onGameStarted)
            }
            if (options.onErrorOccurred) {
                socket.off('errorOccurred', options.onErrorOccurred)
            }
            if (options.onPlayerJoined) {
                socket.off('playerJoined', options.onPlayerJoined)
            }
            if (options.onPlayerLeft) {
                socket.off('playerLeft', options.onPlayerLeft)
            }
            if (options.onChatMessageReceived) {
                socket.off('chatMessageReceived', options.onChatMessageReceived)
            }
            if (options.onBettingPhaseStarted) {
                socket.off('bettingPhaseStarted', options.onBettingPhaseStarted)
            }
            if (options.onPlayerActed) {
                socket.off('playerActed', options.onPlayerActed)
            }
            if (options.onBettingPhaseCompleted) {
                socket.off('bettingPhaseCompleted', options.onBettingPhaseCompleted)
            }
            if (options.onDiceRolled) {
                socket.off('diceRolled', options.onDiceRolled)
            }
            if (options.onCardsSelected) {
                socket.off('cardsSelected', options.onCardsSelected)
            }
            if (options.onCardsImproved) {
                socket.off('cardsImproved', options.onCardsImproved)
            }
            if (options.onRoundEnded) {
                socket.off('roundEnded', options.onRoundEnded)
            }
            if (options.onGameEnded) {
                socket.off('gameEnded', options.onGameEnded)
            }
        }
    }, [options])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect()
        }
    }, [disconnect])

    return {
        socket: socketRef.current,
        connect,
        disconnect,
        emit,
        isConnected: socketRef.current?.connected || false
    }
} 
import { io } from 'socket.io-client';
import { API_URL } from './api';

// Socket.io client singleton
let socket = null;

/**
 * Get or create the socket connection
 * Uses API_URL by default, can be overridden with SOCKET_URL env variable
 */
export const getSocket = () => {
    if (!socket) {
        // In production, you can set EXPO_PUBLIC_SOCKET_URL to override
        const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || API_URL;

        socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.log('[Socket] Connection error:', error.message);
        });
    }
    return socket;
};

/**
 * Join a story room to receive real-time updates
 * @param {number} storyId - The story ID to join
 */
export const joinStoryRoom = (storyId) => {
    const s = getSocket();
    s.emit('join_story', storyId);
    console.log('[Socket] Joined story room:', storyId);
};

/**
 * Leave a story room
 * @param {number} storyId - The story ID to leave
 */
export const leaveStoryRoom = (storyId) => {
    const s = getSocket();
    s.emit('leave_story', storyId);
    console.log('[Socket] Left story room:', storyId);
};

/**
 * Subscribe to new comments on the current story
 * @param {function} callback - Called with new comment data
 * @returns {function} Unsubscribe function
 */
export const onNewComment = (callback) => {
    const s = getSocket();
    s.on('new_comment', callback);
    return () => s.off('new_comment', callback);
};

/**
 * Subscribe to new replies on comments
 * @param {function} callback - Called with new reply data
 * @returns {function} Unsubscribe function
 */
export const onNewReply = (callback) => {
    const s = getSocket();
    s.on('new_reply', callback);
    return () => s.off('new_reply', callback);
};

/**
 * Disconnect the socket (call on app close/logout)
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

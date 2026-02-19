import Constants from 'expo-constants';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For local development on Android, localhost points to the device itself.
// We need the IP of the computer. Expo exposes this via the manifest.
const getBaseUrl = () => {
    // If running in browser
    if (typeof window !== "undefined") {
        return 'http://localhost:3000';
    }
    // If running on device/emulator, standard Expo host usage:
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || '';
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:3000`;
};

export const API_URL = getBaseUrl();

// Helper for authenticated requests to handle token expiration
const authenticatedFetch = async (url, options = {}) => {
    const response = await fetch(url, options);

    // 401: Unauthorized (Missing token)
    // 403: Forbidden (Invalid/Expired token)
    if (response.status === 401 || response.status === 403) {
        console.log('Session expired or invalid, logging out...');
        try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            router.replace('/auth/login');
        } catch (e) {
            console.error('Logout handling error:', e);
        }
        // Throwing error to stop further execution in the caller
        throw new Error('Session expired. Please log in again.');
    }

    return response;
};

export const fetchUsers = async () => {
    try {
        const response = await fetch(`${API_URL}/users`);
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
};

export const getBook = async (id, token = null) => {
    try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Using standard fetch here as backend currently ignores invalid tokens (returns free tier)
        const response = await fetch(`${API_URL}/api/books/${id}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch book');
        return await response.json();
    } catch (error) {
        console.error("Fetch Book Error:", error);
        return null;
    }
};

export const getStory = async (id) => {
    try {
        const response = await fetch(`${API_URL}/api/stories/${id}`);
        if (!response.ok) throw new Error('Failed to fetch story');
        return await response.json();
    } catch (error) {
        console.error("Fetch Story Error:", error);
        return null;
    }
};

export const subscribe = async (token) => {
    try {
        const response = await authenticatedFetch(`${API_URL}/api/subscribe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Subscription failed');
        }
        return await response.json();
    } catch (error) {
        console.error("Subscription Error:", error);
        throw error;
    }
};

export const login = async (email, password) => {
    try {
        // Use standard fetch to avoid auto-redirect loop on 401 credentials error
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        return data;
    } catch (error) {
        throw error;
    }
};

export const register = async (email, password) => {
    try {
        // Use standard fetch
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');
        return data;
    } catch (error) {
        throw error;
    }
};

export const startReading = async (bookId, token) => {
    try {
        const response = await authenticatedFetch(`${API_URL}/api/readings/${bookId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to start reading');
        return await response.json();
    } catch (error) {
        console.error("Start Reading Error:", error);
        throw error;
    }
};

export const returnBook = async (bookId, token) => {
    try {
        const response = await authenticatedFetch(`${API_URL}/api/readings/${bookId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Failed to return book (${response.status})`);
        }
        return await response.json();
    } catch (error) {
        console.error("Return Book Error:", error);
        throw error;
    }
};

export const updateProgress = async (bookId, position, total, progress, token, chapterIndex = 0) => {
    try {
        await authenticatedFetch(`${API_URL}/api/readings/${bookId}/progress`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ position, total, progress, chapterIndex })
        });
    } catch (error) {
        // Silent error for progress updates usually better, but auto-logout is handled by helper
        console.error("Progress Update Error:", error);
    }
};

export const getReadings = async (token) => {
    try {
        const response = await authenticatedFetch(`${API_URL}/api/readings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Get Readings Error:", error);
        return [];
    }
};

export const getReadingStatus = async (bookId, token) => {
    try {
        const response = await authenticatedFetch(`${API_URL}/api/readings/${bookId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Get Reading Status Error:", error);
        return null;
    }
};

// ==================== WRITER API FUNCTIONS ====================

export const getWriterStories = async (token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch stories:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to fetch stories');
    }
    return await response.json();
};

export const createStory = async (data, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Create story failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to create story');
    }
    return await response.json();
};

export const getWriterStory = async (id, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch story');
    return await response.json();
};

export const updateStory = async (id, data, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update story');
    return await response.json();
};

export const deleteStory = async (id, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete story');
    return await response.json();
};

export const publishStory = async (id, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${id}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to publish story');
    }
    return await response.json();
};

// ==================== CHAPTER API FUNCTIONS ====================

export const getChapters = async (storyId, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${storyId}/chapters`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch chapters');
    return await response.json();
};

export const createChapter = async (storyId, data, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${storyId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create chapter');
    return await response.json();
};

export const updateChapter = async (storyId, chapterId, data, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${storyId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update chapter');
    return await response.json();
};

export const deleteChapter = async (storyId, chapterId, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${storyId}/chapters/${chapterId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete chapter');
    return await response.json();
};

export const reorderChapters = async (storyId, chapterIds, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/writer/stories/${storyId}/chapters/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ chapterIds })
    });
    if (!response.ok) throw new Error('Failed to reorder chapters');
    return await response.json();
};

// ==================== FILE UPLOAD FUNCTIONS ====================

export const uploadFile = async (formData, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/upload-file`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data', // Usually handled automatically by fetch with FormData
        },
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload file');
    }
    return await response.json();
};

export const parseFile = async (data, token) => {
    const response = await authenticatedFetch(`${API_URL}/api/parse-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Parse failed' }));
        throw new Error(errorData.error || 'Failed to parse file');
    }
    return await response.json();
};

// ==================== READING STATS API FUNCTIONS ====================

export const getReadingStats = async (token, week = null) => {
    try {
        const url = week
            ? `${API_URL}/api/user/reading-stats?week=${week}`
            : `${API_URL}/api/user/reading-stats`;

        const response = await authenticatedFetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch reading stats');
        return await response.json();
    } catch (error) {
        console.error('Get Reading Stats Error:', error);
        throw error;
    }
};

export const updateReadingGoal = async (goalType, goalValue, token) => {
    try {
        const response = await authenticatedFetch(`${API_URL}/api/user/reading-goal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goal_type: goalType, goal_value: goalValue })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update reading goal');
        }
        return await response.json();
    } catch (error) {
        console.error('Update Reading Goal Error:', error);
        throw error;
    }
};


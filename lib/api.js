import Constants from 'expo-constants';

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

        const response = await fetch(`${API_URL}/api/books/${id}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch book');
        return await response.json();
    } catch (error) {
        console.error("Fetch Book Error:", error);
        return null;
    }
};

export const subscribe = async (token) => {
    try {
        const response = await fetch(`${API_URL}/api/subscribe`, {
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
        const response = await fetch(`${API_URL}/api/readings/${bookId}`, {
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
        const response = await fetch(`${API_URL}/api/readings/${bookId}`, {
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
        await fetch(`${API_URL}/api/readings/${bookId}/progress`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ position, total, progress, chapterIndex })
        });
    } catch (error) {
        console.error("Progress Update Error:", error);
    }
};

export const getReadings = async (token) => {
    try {
        const response = await fetch(`${API_URL}/api/readings`, {
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
        const response = await fetch(`${API_URL}/api/readings/${bookId}`, {
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
    const response = await fetch(`${API_URL}/api/writer/stories`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch stories');
    return await response.json();
};

export const createStory = async (data, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories`, {
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

export const getStory = async (id, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch story');
    return await response.json();
};

export const updateStory = async (id, data, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update story');
    return await response.json();
};

export const deleteStory = async (id, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete story');
    return await response.json();
};

export const publishStory = async (id, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories/${id}/publish`, {
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
    const response = await fetch(`${API_URL}/api/writer/stories/${storyId}/chapters`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch chapters');
    return await response.json();
};

export const createChapter = async (storyId, data, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories/${storyId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create chapter');
    return await response.json();
};

export const updateChapter = async (storyId, chapterId, data, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories/${storyId}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update chapter');
    return await response.json();
};

export const deleteChapter = async (storyId, chapterId, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories/${storyId}/chapters/${chapterId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete chapter');
    return await response.json();
};

export const reorderChapters = async (storyId, chapterIds, token) => {
    const response = await fetch(`${API_URL}/api/writer/stories/${storyId}/chapters/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ chapterIds })
    });
    if (!response.ok) throw new Error('Failed to reorder chapters');
    return await response.json();
};

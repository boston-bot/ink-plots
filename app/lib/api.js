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

export const updateProgress = async (bookId, position, total, progress, token) => {
    try {
        await fetch(`${API_URL}/api/readings/${bookId}/progress`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ position, total, progress })
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

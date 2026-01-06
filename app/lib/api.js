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

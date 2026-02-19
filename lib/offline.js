import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_PREFIX = 'offline_book_';

/**
 * Save a book's full content and metadata to local storage.
 * @param {object} book - The book object (must include id, title, content, etc.)
 */
export const saveBookToOffline = async (book) => {
    try {
        if (!book || !book.id) throw new Error('Invalid book data');
        const key = `${OFFLINE_PREFIX}${book.id}`;
        // Store the timestamp of download
        const data = { ...book, downloadedAt: Date.now() };
        await AsyncStorage.setItem(key, JSON.stringify(data));
        console.log(`[Offline] Saved book ${book.id}`);
        return true;
    } catch (e) {
        console.error('[Offline] Save failed:', e);
        return false;
    }
};

/**
 * Retrieve a book from offline storage.
 * @param {string|number} bookId 
 */
export const getOfflineBook = async (bookId) => {
    try {
        const key = `${OFFLINE_PREFIX}${bookId}`;
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('[Offline] Retrieve failed:', e);
        return null;
    }
};

/**
 * Remove a book from offline storage.
 * @param {string|number} bookId 
 */
export const removeBookFromOffline = async (bookId) => {
    try {
        const key = `${OFFLINE_PREFIX}${bookId}`;
        await AsyncStorage.removeItem(key);
        console.log(`[Offline] Removed book ${bookId}`);
        return true;
    } catch (e) {
        console.error('[Offline] Remove failed:', e);
        return false;
    }
};

/**
 * Get all books currently stored offline.
 */
export const getOfflineLibrary = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const bookKeys = keys.filter(k => k.startsWith(OFFLINE_PREFIX));
        const stores = await AsyncStorage.multiGet(bookKeys);

        return stores.map(([key, value]) => {
            if (!value) return null;
            return JSON.parse(value);
        }).filter(Boolean);
    } catch (e) {
        console.error('[Offline] Library fetch failed:', e);
        return [];
    }
};

/**
 * Check if a specific book is downloaded.
 */
export const isBookOffline = async (bookId) => {
    try {
        const key = `${OFFLINE_PREFIX}${bookId}`;
        const data = await AsyncStorage.getItem(key);
        return !!data;
    } catch (e) {
        return false;
    }
};

const PROGRESS_PREFIX = 'offline_progress_';

/**
 * Save reading progress locally.
 */
export const saveOfflineProgress = async (bookId, progressData) => {
    try {
        const key = `${PROGRESS_PREFIX}${bookId}`;
        await AsyncStorage.setItem(key, JSON.stringify({ ...progressData, timestamp: Date.now() }));
    } catch (e) {
        console.error('[Offline] Progress save failed:', e);
    }
};

/**
 * Remove local reading progress.
 */
export const removeOfflineProgress = async (bookId) => {
    try {
        const key = `${PROGRESS_PREFIX}${bookId}`;
        await AsyncStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error('[Offline] Remove progress failed:', e);
        return false;
    }
};

/**
 * Get local reading progress.
 */
export const getOfflineProgress = async (bookId) => {
    try {
        const key = `${PROGRESS_PREFIX}${bookId}`;
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
};

/**
 * Get all local progress entries.
 */
export const getAllOfflineProgress = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const progKeys = keys.filter(k => k.startsWith(PROGRESS_PREFIX));
        const stores = await AsyncStorage.multiGet(progKeys);

        return stores.map(([key, value]) => {
            if (!value) return null;
            const bookId = key.replace(PROGRESS_PREFIX, '');
            return { book_id: bookId, ...JSON.parse(value) };
        }).filter(Boolean);
    } catch (e) {
        return [];
    }
};

const DRAFT_PREFIX = 'offline_draft_';

/**
 * Save a writer draft locally.
 * @param {string|number} storyId 
 * @param {object} data - The partial or full story data
 */
export const saveDraft = async (storyId, data) => {
    try {
        const key = `${DRAFT_PREFIX}${storyId}`;
        const draft = { ...data, local_updated_at: Date.now() };
        await AsyncStorage.setItem(key, JSON.stringify(draft));
        // console.log(`[Offline] Saved draft ${storyId}`);
    } catch (e) {
        console.error('[Offline] Draft save failed:', e);
    }
};

/**
 * Get a local writer draft.
 * @param {string|number} storyId 
 */
export const getDraft = async (storyId) => {
    try {
        const key = `${DRAFT_PREFIX}${storyId}`;
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
};

/**
 * Remove a local writer draft.
 * @param {string|number} storyId 
 */
export const removeDraft = async (storyId) => {
    try {
        const key = `${DRAFT_PREFIX}${storyId}`;
        await AsyncStorage.removeItem(key);
    } catch (e) {
        console.error('[Offline] Draft remove failed:', e);
    }
};

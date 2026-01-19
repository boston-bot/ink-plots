import { View, Text, ScrollView, Image as RNImage, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import HeaderProfile from '../../components/HeaderProfile';
import { getBook, subscribe, API_URL, startReading, updateProgress, getReadingStatus, returnBook } from '../../lib/api';
import { saveBookToOffline, getOfflineBook, removeBookFromOffline, isBookOffline, saveOfflineProgress, getOfflineProgress, removeOfflineProgress } from '../../lib/offline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import ReaderSettings from '../../components/ReaderSettings';

const THEMES = {
    light: { bg: '#ffffff', text: '#222222', meta: '#666666' },
    sepia: { bg: '#FBF0D9', text: '#5F4B32', meta: '#8B735B' },
    dark: { bg: '#1a1a1a', text: '#cccccc', meta: '#888888' },
};

export default function Reader() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    // Book & State
    const [book, setBook] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [activeChapterIndex, setActiveChapterIndex] = useState(0);

    // Appearance
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        theme: 'light',
        fontFamily: 'serif',
        fontSize: 18,
    });

    // Metadata
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [readingStatus, setReadingStatus] = useState(null);
    const [isStarted, setIsStarted] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);

    const scrollRef = useRef(null);
    const lastScrollUpdate = useRef(0);

    useEffect(() => {
        loadBook();
        loadSettings();
    }, [id]);

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem('reader_settings');
            if (saved) setSettings(JSON.parse(saved));
        } catch (e) {
            console.log('Failed to load settings');
        }
    };

    const updateSettings = async (newSettings) => {
        setSettings(newSettings);
        await AsyncStorage.setItem('reader_settings', JSON.stringify(newSettings));
    };

    const loadBook = async () => {
        setLoading(true);
        const token = await AsyncStorage.getItem('userToken');

        try {
            const [bookData, statusData, offlineParams, localProgress] = await Promise.all([
                getBook(id, token),
                getReadingStatus(id, token),
                isBookOffline(id),
                getOfflineProgress(id)
            ]);

            // 1. Handle Structure (Book + Chapters)
            if (bookData) {
                setBook(bookData);
                if (bookData.chapters && bookData.chapters.length > 0) {
                    setChapters(bookData.chapters);
                } else if (bookData.content) {
                    // Backwards compatibility / Single chapter
                    setChapters([{ id: 'mock', title: 'Chapter 1', content: bookData.content, sequence_number: 1 }]);
                }
            } else {
                // Offline Fallback
                const offlineBook = await getOfflineBook(id);
                if (offlineBook) {
                    setBook(offlineBook);
                    setChapters(offlineBook.chapters || [{ title: 'Chapter 1', content: offlineBook.content }]);
                }
            }

            // 2. Handle Status (Progress)
            const mergedStatus = statusData || localProgress;
            setReadingStatus(mergedStatus);
            setIsDownloaded(offlineParams);

            if (mergedStatus) {
                setIsStarted(true);
            }

            // 3. Restore Chapter Position
            if (mergedStatus && mergedStatus.current_chapter_index !== undefined) {
                setActiveChapterIndex(mergedStatus.current_chapter_index);
            } else {
                setActiveChapterIndex(0);
            }

        } catch (e) {
            console.error("Load Book Error", e);
            // Final Fallback
            const offlineBook = await getOfflineBook(id);
            const localProgress = await getOfflineProgress(id);

            if (offlineBook) {
                setBook(offlineBook);
                setChapters(offlineBook.chapters || [{ title: 'Chapter 1', content: offlineBook.content }]);
                setReadingStatus(localProgress);
                setIsDownloaded(true);
                setIsStarted(true);

                if (localProgress && localProgress.current_chapter_index) {
                    setActiveChapterIndex(localProgress.current_chapter_index);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.includes('localhost') && API_URL.includes('http')) {
            const apiHost = API_URL.split('://')[1].split(':')[0];
            return url.replace('localhost', apiHost);
        }
        return url;
    };

    const handleStartReading = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return router.push('/auth/login');

            // 1. Register on Server
            try {
                await startReading(id, token);
            } catch (err) {
                console.warn("Server sync failed, proceeding locally if possible", err);
            }

            // 2. Save Offline
            if (book) {
                const saved = await saveBookToOffline(book);
                if (saved) setIsDownloaded(true);
            }

            setIsStarted(true);
            setReadingStatus({ current_position: 0 });
            setActiveChapterIndex(0);

            Alert.alert("Success", "Book checked out and downloaded for offline reading.");

        } catch (e) {
            console.error("Start Reading Fatal Error", e);
            Alert.alert("Error", "Could not start reading session: " + e.message);
        }
    };

    const handleNextChapter = async () => {
        const nextIndex = activeChapterIndex + 1;
        if (nextIndex < chapters.length) {
            const nextChapter = chapters[nextIndex];

            if (nextChapter.locked) {
                Alert.alert("Locked", "This chapter is for Premium subscribers only. Please upgrade.");
                return;
            }

            // Move to next
            setActiveChapterIndex(nextIndex);
            scrollRef.current?.scrollTo({ y: 0, animated: false });

            // Save Progress (0% of next chapter)
            await saveProgress(nextIndex, 0, 0);
        } else {
            Alert.alert("Finished", "You have reached the end of the book!");
        }
    };

    const handlePrevChapter = async () => {
        const prevIndex = activeChapterIndex - 1;
        if (prevIndex >= 0) {
            setActiveChapterIndex(prevIndex);
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            // Should properly restore to bottom? For now top.
            await saveProgress(prevIndex, 0, 0);
        }
    };

    const handleScroll = async (event) => {
        if (!isStarted || !book) return;

        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const scrollY = contentOffset.y;
        const totalHeight = contentSize.height - layoutMeasurement.height;

        if (totalHeight <= 0) return;

        const now = Date.now();
        if (now - lastScrollUpdate.current > 2000) {
            await saveProgress(activeChapterIndex, scrollY, totalHeight);
        }
    };

    const saveProgress = async (chapterIndex, scrollY, totalHeight) => {
        // Global Progress Logic
        const chapterProgress = totalHeight > 0 ? scrollY / totalHeight : 0;
        const totalChapters = chapters.length || 1;

        // (Index + Percent) / Total
        const globalProgress = Math.min(1, Math.max(0, (chapterIndex + chapterProgress) / totalChapters));

        lastScrollUpdate.current = Date.now();

        const progressData = {
            current_chapter_index: chapterIndex,
            current_position: Math.floor(scrollY),
            total_length: Math.floor(totalHeight),
            progress: globalProgress
        };

        // 1. Save Local
        await saveOfflineProgress(id, progressData);

        // 2. Sync Server
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            updateProgress(id, Math.floor(scrollY), Math.floor(totalHeight), globalProgress, token, chapterIndex);
        }
    };

    const onContentSizeChange = (w, h) => {
        // Restore scroll IF we are on the same chapter as saved status
        if (readingStatus && readingStatus.current_position > 0 && scrollRef.current && activeChapterIndex === readingStatus.current_chapter_index) {
            if (!scrollRef.current.restored) {
                scrollRef.current.scrollTo({ y: readingStatus.current_position, animated: false });
                scrollRef.current.restored = true;
            }
        }
    };

    const handleSubscribe = async () => {
        // ... (Same subscribe logic) ...
        setUpgrading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                const res = await subscribe(token);
                if (res.token) {
                    await AsyncStorage.setItem('userToken', res.token);
                    await AsyncStorage.setItem('userData', JSON.stringify(res.user));
                    alert('Subscribed!');
                    loadBook();
                }
            }
        } catch (e) { alert(e.message); }
        finally { setUpgrading(false); }
    };

    // Render helpers
    if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
    if (!book) return <View style={{ flex: 1, justifyContent: 'center' }}><Text>Book not found</Text></View>;

    const activeChapter = chapters[activeChapterIndex] || {};
    const theme = THEMES[settings.theme] || THEMES.light;

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <StatusBar
                barStyle={settings.theme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={theme.bg}
            />

            <Stack.Screen options={{
                title: activeChapter.title || book.title,
                headerStyle: { backgroundColor: theme.bg },
                headerTintColor: theme.text,
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/dashboard');
                            }
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8, padding: 8 }}
                    >
                        <ChevronLeft color={theme.text} size={28} />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => setShowSettings(true)} style={{ marginRight: 15, padding: 4 }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Aa</Text>
                        </TouchableOpacity>
                        <HeaderProfile />
                    </View>
                ),
                headerBackVisible: false,
                headerShadowVisible: false, // Cleaner look
            }} />

            <ReaderSettings
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onUpdate={updateSettings}
            />

            <ScrollView
                ref={scrollRef}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                style={{ backgroundColor: theme.bg }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={onContentSizeChange}
            >
                {/* Book Header (Cover/Title) - Contextual */}
                {activeChapterIndex === 0 && (
                    <View style={{ padding: 20, paddingTop: 40, alignItems: 'center' }}>
                        <View style={{ width: 120, height: 180, backgroundColor: '#eee', borderRadius: 8, marginBottom: 20, elevation: 5 }}>
                            {book.cover_image_url && <RNImage source={{ uri: getImageUrl(book.cover_image_url) }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />}
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: theme.text, fontFamily: settings.fontFamily }}>{book.title}</Text>
                        <Text style={{ fontSize: 16, color: theme.meta, fontFamily: settings.fontFamily, marginTop: 5 }}>by {book.author}</Text>
                    </View>
                )}

                {!isStarted ? (
                    <View style={{ padding: 30, alignItems: 'center' }}>
                        <TouchableOpacity onPress={handleStartReading} style={{ backgroundColor: theme.text, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 }}>
                            <Text style={{ color: theme.bg, fontSize: 16, fontWeight: 'bold' }}>Start Reading</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: 25, paddingVertical: 10 }}>

                        {/* Chapter Header nav */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, alignItems: 'center' }}>
                            <Text style={{ color: theme.meta, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Chapter {activeChapterIndex + 1} of {chapters.length}
                            </Text>
                            <TouchableOpacity onPress={async () => {
                                const token = await AsyncStorage.getItem('userToken');
                                if (token) await returnBook(id, token);
                                await removeBookFromOffline(id);
                                await removeOfflineProgress(id);
                                setIsStarted(false); setIsDownloaded(false); setReadingStatus(null);
                            }}>
                                <Text style={{ color: '#d9534f', fontSize: 12, fontWeight: 'bold' }}>RETURN BOOK</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 30, fontFamily: settings.fontFamily, color: theme.text }}>{activeChapter.title}</Text>

                        {activeChapter.locked ? (
                            <View style={{ padding: 40, alignItems: 'center', backgroundColor: settings.theme === 'dark' ? '#333' : '#f9f9f9', borderRadius: 12 }}>
                                <Text style={{ fontSize: 40 }}>🔒</Text>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginTop: 10 }}>Chapter Locked</Text>
                                <Text style={{ textAlign: 'center', marginVertical: 10, color: theme.meta }}>Premium content.</Text>
                                <TouchableOpacity onPress={handleSubscribe} style={{ backgroundColor: theme.text, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                                    <Text style={{ color: theme.bg, fontWeight: 'bold' }}>Unlock Now</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={{
                                fontSize: settings.fontSize,
                                lineHeight: settings.fontSize * 1.6,
                                fontFamily: settings.fontFamily,
                                color: theme.text,
                                marginBottom: 40
                            }}>
                                {activeChapter.content}
                            </Text>
                        )}

                        {/* Navigation Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: settings.theme === 'dark' ? '#333' : '#eee', paddingTop: 30, marginTop: 20 }}>
                            <TouchableOpacity
                                onPress={handlePrevChapter}
                                disabled={activeChapterIndex === 0}
                                style={{ opacity: activeChapterIndex === 0 ? 0.3 : 1, padding: 10 }}
                            >
                                <Text style={{ fontSize: 16, color: theme.text, fontFamily: settings.fontFamily }}>← Previous</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleNextChapter}
                                disabled={activeChapter.locked || activeChapterIndex >= chapters.length - 1}
                                style={{ opacity: (activeChapterIndex >= chapters.length - 1) ? 0.3 : 1, padding: 10 }}
                            >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, fontFamily: settings.fontFamily }}>Next Chapter →</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                )}

            </ScrollView>
        </View>
    );
}

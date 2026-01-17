import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { getBook, subscribe, API_URL, startReading, updateProgress, getReadingStatus } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

export default function Reader() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [readingStatus, setReadingStatus] = useState(null);
    const [isStarted, setIsStarted] = useState(false);
    const scrollRef = useRef(null);
    const lastScrollUpdate = useRef(0);

    useEffect(() => {
        loadBook();
    }, [id]);

    const loadBook = async () => {
        setLoading(true);
        const token = await AsyncStorage.getItem('userToken');

        // Parallel checks
        const [bookData, statusData] = await Promise.all([
            getBook(id, token),
            getReadingStatus(id, token)
        ]);

        setBook(bookData);
        setReadingStatus(statusData);

        if (statusData) {
            setIsStarted(true);
        }

        setLoading(false);
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

            await startReading(id, token);
            setIsStarted(true);
            setReadingStatus({ current_position: 0 }); // Optimistic update
        } catch (e) {
            Alert.alert("Error", "Could not start reading session.");
        }
    };

    const handleScroll = async (event) => {
        if (!isStarted || !book) return;

        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const scrollY = contentOffset.y;
        const totalHeight = contentSize.height - layoutMeasurement.height;

        // Prevent negative progress
        if (totalHeight <= 0) return;

        const progress = Math.min(1, Math.max(0, scrollY / totalHeight));
        const now = Date.now();

        // Throttle updates: every 2 seconds
        if (now - lastScrollUpdate.current > 2000) {
            lastScrollUpdate.current = now;
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                // We use scroll Y as "position" for simplicity here
                updateProgress(id, Math.floor(scrollY), Math.floor(totalHeight), progress, token);
            }
        }
    };

    const handleSubscribe = async () => {
        setUpgrading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                router.push('/auth/login');
                return;
            }

            const res = await subscribe(token);
            if (res.token) {
                await AsyncStorage.setItem('userToken', res.token);
                await AsyncStorage.setItem('userData', JSON.stringify(res.user));
                alert('Subscribed successfully! Content unlocked.');
                loadBook();
            }
        } catch (e) {
            alert(e.message);
        } finally {
            setUpgrading(false);
        }
    };

    // Restore scroll position
    const onContentSizeChange = (w, h) => {
        if (readingStatus && readingStatus.current_position > 0 && scrollRef.current) {
            // Only restore once
            if (!scrollRef.current.restored) {
                scrollRef.current.scrollTo({ y: readingStatus.current_position, animated: false });
                scrollRef.current.restored = true;
            }
        }
    };

    if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
    if (!book) return <View style={{ flex: 1, justifyContent: 'center' }}><Text style={{ textAlign: 'center' }}>Book not found</Text></View>;

    return (
        <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ flexGrow: 1, backgroundColor: book.cover_color || '#fff', paddingBottom: 60 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={onContentSizeChange}
        >
            <Stack.Screen options={{ title: book.title }} />

            {/* Header */}
            <View style={{ padding: 20, paddingTop: 40, alignItems: 'center' }}>
                <View style={{
                    width: 120, height: 180, backgroundColor: '#eee',
                    borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
                    marginBottom: 20, overflow: 'hidden'
                }}>
                    {book.cover_image_url ? (
                        <Image source={{ uri: getImageUrl(book.cover_image_url) }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 30 }}>📖</Text>
                        </View>
                    )}
                </View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 }}>{book.title}</Text>
                <Text style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>by {book.author}</Text>
                {book.is_premium && <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}><Text style={{ fontSize: 12, fontWeight: 'bold' }}>PREMIUM</Text></View>}
            </View>

            {/* Start Action or Content */}
            {!isStarted ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ textAlign: 'center', color: '#666', marginBottom: 30 }}>
                        Ready to dive in? Start reading to track your progress and resume anytime.
                    </Text>
                    <TouchableOpacity
                        onPress={handleStartReading}
                        style={{ backgroundColor: '#333', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 }}
                    >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Start Reading</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, minHeight: 500 }}>
                    <Text style={{ fontSize: 18, lineHeight: 32, fontFamily: 'serif', color: '#333' }}>
                        {book.content}
                    </Text>

                    {/* Truncation / Upgrade Overlay */}
                    {book.access_limited && (
                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 }}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', '#fff']}
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                            />
                            <View style={{ alignItems: 'center', zIndex: 10, padding: 20 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>Keep Reading?</Text>
                                <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>Unlock this book and the entire library for just $3.99/mo.</Text>

                                <TouchableOpacity
                                    onPress={handleSubscribe}
                                    disabled={upgrading}
                                    style={{ backgroundColor: '#000', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 }}>
                                    {upgrading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Subscribe Now</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

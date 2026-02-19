import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, Platform, Image } from 'react-native';
import AnimatedEntry from '../../components/AnimatedEntry';
import { useRouter, Link } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribe, getReadings, getReadingStats, API_URL } from '../../lib/api';
import { getOfflineLibrary, getAllOfflineProgress } from '../../lib/offline';
import { useFocusEffect } from '@react-navigation/native';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [upgrading, setUpgrading] = useState(false);
    const [readings, setReadings] = useState([]);
    const [readingStats, setReadingStats] = useState(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const userData = await AsyncStorage.getItem('userData');
        const token = await AsyncStorage.getItem('userToken');

        if (userData) setUser(JSON.parse(userData));

        // 1. Fetch API Data
        let apiReadings = [];
        if (token) {
            apiReadings = await getReadings(token);

            // Fetch weekly reading stats
            try {
                const stats = await getReadingStats(token);
                setReadingStats(stats);
            } catch (e) {
                console.error('Failed to load reading stats:', e);
            }
        }

        // 2. Fetch Offline Data
        const offlineBooks = await getOfflineLibrary();
        const offlineProgress = await getAllOfflineProgress();

        // 3. Merge Strategies
        const readingMap = new Map();

        // Add Offline first
        offlineBooks.forEach(book => {
            const progressEntry = offlineProgress.find(p => p.book_id == book.id);
            readingMap.set(book.id, {
                book_id: book.id,
                title: book.title,
                author: book.author,
                cover_image_url: book.cover_image_url,
                progress: progressEntry ? progressEntry.progress : 0,
                last_read_at: progressEntry ? progressEntry.timestamp : 0
            });
        });

        // Overlay API data (truth)
        apiReadings.forEach(item => {
            // If exists, update. If not, add.
            // API usually has fresher last_read_at if synced
            readingMap.set(item.book_id, item);
        });

        // Sort by recency seems good
        const mergedList = Array.from(readingMap.values());
        // mergedList.sort((a, b) => new Date(b.last_read_at) - new Date(a.last_read_at));

        setReadings(mergedList);
    };

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.includes('localhost') && API_URL.includes('http')) {
            const apiHost = API_URL.split('://')[1].split(':')[0];
            return url.replace('localhost', apiHost);
        }
        return url;
    };

    const handleSubscribe = async () => {
        setUpgrading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await subscribe(token);
            if (res.token) {
                await AsyncStorage.setItem('userToken', res.token);
                await AsyncStorage.setItem('userData', JSON.stringify(res.user));
                setUser(res.user);
                alert('Upgraded to Premium!');
            }
        } catch (e) {
            alert(e.message);
        } finally {
            setUpgrading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Subscription Banner */}
            {user && (
                <AnimatedEntry>
                    <View style={styles.subCard}>
                        <View>
                            <Text style={styles.subLabel}>Current Plan</Text>
                            <Text style={styles.subTier}>{user.subscription_tier === 'premium' ? 'Premium Member' : 'Free Reader'}</Text>
                        </View>
                        {user.subscription_tier !== 'premium' && (
                            <TouchableOpacity onPress={handleSubscribe} disabled={upgrading} style={styles.upgradeBtn}>
                                {upgrading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.upgradeText}>Upgrade ($3.99/mo)</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                </AnimatedEntry>
            )}

            <AnimatedEntry delay={100}>
                <Text style={styles.sectionTitle}>Currently Reading</Text>
                {readings.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.framesContainer}>
                        {readings.map((item) => (
                            <TouchableOpacity key={item.book_id} onPress={() => router.push(`/read/${item.book_id}`)} style={styles.frame}>
                                <View style={[styles.frameCover, !item.cover_image_url && styles.writingCover]}>
                                    {item.cover_image_url && <Image source={{ uri: getImageUrl(item.cover_image_url) }} style={{ width: '100%', height: '100%', borderRadius: 4 }} resizeMode="cover" />}
                                </View>
                                <View style={styles.frameInfo}>
                                    <Text style={styles.frameTitle} numberOfLines={2}>{item.title}</Text>
                                    <Text style={styles.frameAuthor}>{item.author}</Text>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${(item.progress || 0) * 100}%` }]} />
                                    </View>
                                    <Text style={styles.badge}>{Math.round((item.progress || 0) * 100)}% Complete</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {/* Always visible 'More' card at the end of the list */}
                        <TouchableOpacity onPress={() => router.push('/library')} style={[styles.frame, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' }]}>
                            <Text style={{ fontFamily: 'serif', fontSize: 16, color: '#666' }}>+ Browse Library</Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (


                    <View style={{ padding: 20, alignItems: 'center', marginBottom: 30, backgroundColor: '#fff', borderRadius: 12 }}>
                        <Text style={{ color: '#999', marginBottom: 10 }}>You haven't started any books yet.</Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    window.location.href = '/library';
                                } else {
                                    router.replace('/library');
                                }
                            }}
                            style={{ padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 }}
                        >
                            <Text style={{ fontWeight: 'bold' }}>Browse Library</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </AnimatedEntry>

            <AnimatedEntry delay={200} style={styles.goalSection}>
                <Text style={styles.sectionTitle}>Weekly Reading Goal</Text>
                {readingStats ? (
                    <View style={styles.goalCard}>
                        <View style={styles.goalHeader}>
                            <View style={styles.goalStat}>
                                <Text style={styles.goalNumber}>{readingStats.goal.progress}</Text>
                                <Text style={styles.goalLabel}>
                                    {readingStats.goal.type === 'books' ? 'Books Completed' : 'Minutes Read'}
                                </Text>
                                <Text style={styles.goalTarget}>
                                    Goal: {readingStats.goal.value} {readingStats.goal.type === 'books' ? 'books' : 'min'}
                                </Text>
                            </View>
                            <View style={styles.graphContainer}>
                                {/* Real Daily Activity Bars */}
                                {readingStats.daily_activity.map((day, i) => {
                                    const maxMinutes = Math.max(...readingStats.daily_activity.map(d => d.minutes), 1);
                                    const height = Math.max(10, (day.minutes / maxMinutes) * 90);
                                    return (
                                        <View key={i} style={styles.graphBarWrapper}>
                                            <View style={[styles.graphBar, { height }]} />
                                            <Text style={styles.graphLabel}>{day.day}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                        {readingStats.completed_books.length > 0 ? (
                            <ScrollView horizontal style={styles.goalCovers} showsHorizontalScrollIndicator={false}>
                                {readingStats.completed_books.map((book, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => router.push(`/read/${book.book_id}`)}
                                    >
                                        {book.cover_image_url ? (
                                            <Image
                                                source={{ uri: getImageUrl(book.cover_image_url) }}
                                                style={styles.miniCover}
                                            />
                                        ) : (
                                            <View style={[styles.miniCover, { backgroundColor: book.cover_color || '#ccc' }]} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>No books completed this week yet</Text>
                                <Text style={styles.emptyStateSubtext}>Keep reading to reach your goal!</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.goalCard}>
                        <ActivityIndicator size="small" color="#666" />
                    </View>
                )}
            </AnimatedEntry>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    subCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    subInfo: {
        flex: 1,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    tierText: {
        fontFamily: 'serif',
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    tierDesc: {
        fontFamily: 'serif',
        fontSize: 13,
        color: '#666',
    },
    upgradeBtn: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    upgradeBtnDisabled: {
        opacity: 0.6,
    },
    upgradeBtnText: {
        color: '#fff',
        fontFamily: 'serif',
        fontSize: 14,
        fontWeight: '600',
    },
    sectionTitle: {
        fontFamily: 'serif',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#222',
    },
    currentlyReading: {
        marginBottom: 30,
    },
    bookGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    bookCard: {
        width: 110,
        marginBottom: 15,
    },
    cover: {
        width: 110,
        height: 160,
        borderRadius: 8,
        marginBottom: 8,
    },
    bookTitle: {
        fontFamily: 'serif',
        fontSize: 13,
        fontWeight: '600',
        color: '#222',
        marginBottom: 2,
    },
    bookAuthor: {
        fontFamily: 'serif',
        fontSize: 11,
        color: '#666',
    },
    subLabel: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 5,
    },
    subTier: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'serif',
    },
    upgradeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    framesContainer: {
        flexDirection: 'row',
        marginBottom: 30,
    },
    frame: {
        width: 280,
        height: 160,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginRight: 20,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    frameCover: {
        width: 80,
        height: 120,
        backgroundColor: '#eee',
        borderRadius: 4,
    },
    writingCover: {
        backgroundColor: '#333',
    },
    frameInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    frameTitle: {
        fontFamily: 'serif',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    frameAuthor: {
        fontFamily: 'serif',
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#f0f0f0',
        borderRadius: 2,
        width: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#000',
        borderRadius: 2,
    },
    badge: {
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: '#666',
        marginTop: 5,
    },
    goalSection: {
        marginBottom: 30,
    },
    goalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    goalStat: {
        flex: 1,
    },
    goalNumber: {
        fontFamily: 'serif',
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FF6B35',
    },
    goalLabel: {
        fontFamily: 'serif',
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    goalTarget: {
        fontFamily: 'serif',
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    graphContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        height: 100,
    },
    graphBarWrapper: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
    },
    graphBar: {
        width: 8,
        backgroundColor: '#FF6B35',
        borderRadius: 4,
        marginBottom: 4,
    },
    graphLabel: {
        fontSize: 9,
        color: '#999',
        fontFamily: 'serif',
    },
    goalCovers: {
        flexDirection: 'row',
        gap: 10,
    },
    miniCover: {
        width: 60,
        height: 90,
        borderRadius: 6,
        marginRight: 10,
    },
    miniCoverEmpty: {
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyStateText: {
        fontFamily: 'serif',
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    emptyStateSubtext: {
        fontFamily: 'serif',
        fontSize: 12,
        color: '#999',
    },
});

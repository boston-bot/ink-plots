import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Pressable, Platform } from 'react-native';
import AnimatedEntry from '../../components/AnimatedEntry';
import { useRouter, Link } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribe, getReadings, API_URL } from '../lib/api';
import { useFocusEffect } from '@react-navigation/native';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [upgrading, setUpgrading] = useState(false);
    const [readings, setReadings] = useState([]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const userData = await AsyncStorage.getItem('userData');
        const token = await AsyncStorage.getItem('userToken');

        if (userData) setUser(JSON.parse(userData));

        if (token) {
            const readingData = await getReadings(token);
            setReadings(readingData);
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
                    </ScrollView>
                ) : (


                    <View style={{ padding: 20, alignItems: 'center', marginBottom: 30, backgroundColor: '#fff', borderRadius: 12 }}>
                        <Text style={{ color: '#999', marginBottom: 10 }}>You haven't started any books yet.</Text>
                        <TouchableOpacity
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    window.location.href = '/';
                                } else {
                                    router.replace('/');
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
                <View style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <View style={styles.goalStat}>
                            <Text style={styles.goalNumber}>3</Text>
                            <Text style={styles.goalLabel}>Books Completed</Text>
                        </View>
                        <View style={styles.graphContainer}>
                            {/* Mock Graph Bars */}
                            {[40, 70, 30, 85, 50, 20, 90].map((h, i) => (
                                <View key={i} style={[styles.graphBar, { height: h }]} />
                            ))}
                        </View>
                    </View>
                    <ScrollView horizontal style={styles.goalCovers}>
                        <View style={styles.miniCover} />
                        <View style={styles.miniCover} />
                        <View style={[styles.miniCover, styles.miniCoverEmpty]} />
                    </ScrollView>
                </View>
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
    upgradeBtn: {
        backgroundColor: '#000',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    upgradeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    sectionTitle: {
        fontFamily: 'serif',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    framesContainer: {
        flexDirection: 'row',
        marginBottom: 60,
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
        marginBottom: 40,
    },
    goalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 30,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
        paddingBottom: 20,
    },
    goalStat: {
        alignItems: 'flex-start',
    },
    goalNumber: {
        fontFamily: 'serif',
        fontSize: 48,
        fontWeight: 'bold',
    },
    goalLabel: {
        fontFamily: 'serif',
        fontSize: 14,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    graphContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        height: 60,
    },
    graphBar: {
        width: 8,
        backgroundColor: '#eee',
        borderRadius: 4,
    },
    goalCovers: {
        flexDirection: 'row',
    },
    miniCover: {
        width: 60,
        height: 90,
        backgroundColor: '#eee',
        borderRadius: 4,
        marginRight: 15,
    },
    miniCoverEmpty: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
});

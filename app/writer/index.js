import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, BookOpen, FilePlus } from 'lucide-react-native';
import WriterStoryCard from '../../components/WriterStoryCard';
import HeaderProfile from '../../components/HeaderProfile';
import { getWriterStories, createStory, deleteStory, publishStory } from '../../lib/api';

export default function WriterDashboard() {
    const router = useRouter();
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadStories();
        }, [])
    );

    const loadStories = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                router.replace('/auth/login');
                return;
            }

            const data = await getWriterStories(token);
            setStories(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load stories:', error);
            setLoading(false);
        }
    };

    const handleNewStory = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            console.log('Creating story with token:', token ? 'exists' : 'missing');
            const newStory = await createStory({}, token);
            console.log('Story created:', newStory);
            router.push(`/writer/edit/${newStory.id}`);
        } catch (error) {
            console.error('Failed to create story:', error);
            if (Platform.OS === 'web') {
                alert('Failed to create new story: ' + error.message);
            } else {
                Alert.alert('Error', 'Failed to create new story');
            }
        }
    };

    const handleDelete = async (id) => {
        const confirmDelete = Platform.OS === 'web'
            ? window.confirm('Are you sure you want to delete this story?')
            : await new Promise((resolve) => {
                Alert.alert(
                    'Delete Story',
                    'Are you sure you want to delete this story?',
                    [
                        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                        { text: 'Delete', onPress: () => resolve(true), style: 'destructive' }
                    ]
                );
            });

        if (confirmDelete) {
            try {
                const token = await AsyncStorage.getItem('userToken');
                await deleteStory(id, token);
                loadStories();
            } catch (error) {
                if (Platform.OS === 'web') {
                    alert('Failed to delete story');
                } else {
                    Alert.alert('Error', 'Failed to delete story');
                }
            }
        }
    };

    const handlePublish = async (id) => {
        const confirmPublish = Platform.OS === 'web'
            ? window.confirm('Are you sure you want to publish this story? It will appear in the Stories feed.')
            : await new Promise((resolve) => {
                Alert.alert(
                    'Publish Story',
                    'Are you sure you want to publish this story? It will appear in the Stories feed.',
                    [
                        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                        { text: 'Publish', onPress: () => resolve(true) }
                    ]
                );
            });

        if (confirmPublish) {
            try {
                const token = await AsyncStorage.getItem('userToken');
                await publishStory(id, token);
                if (Platform.OS === 'web') {
                    alert('Story published successfully!');
                } else {
                    Alert.alert('Success', 'Story published successfully!');
                }
                loadStories();
            } catch (error) {
                const msg = error.message || 'Failed to publish story';
                if (Platform.OS === 'web') {
                    alert(msg);
                } else {
                    Alert.alert('Error', msg);
                }
            }
        }
    };

    const drafts = stories.filter(s => s.status === 'draft');
    const published = stories.filter(s => s.status === 'published');

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerTitle: () => (
                    <TouchableOpacity onPress={() => router.replace('/')}>
                        <Text style={{ fontFamily: 'serif', fontSize: 20, fontWeight: 'bold' }}>The Ink Plots</Text>
                    </TouchableOpacity>
                ),
                headerTitleAlign: 'center',
                headerRight: () => <HeaderProfile />,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#F9F7F1' }
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Writer Dashboard</Text>
                        <Text style={styles.subtitle}>Manage your stories and drafts</Text>
                    </View>
                    <TouchableOpacity style={styles.newBtn} onPress={handleNewStory}>
                        <Plus size={20} color="#fff" />
                        <Text style={styles.newBtnText}>New Story</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.stats}>
                    <View style={styles.statCard}>
                        <FilePlus size={24} color="#FFA500" />
                        <Text style={styles.statNumber}>{drafts.length}</Text>
                        <Text style={styles.statLabel}>Drafts</Text>
                    </View>
                    <View style={styles.statCard}>
                        <BookOpen size={24} color="#4CAF50" />
                        <Text style={styles.statNumber}>{published.length}</Text>
                        <Text style={styles.statLabel}>Published</Text>
                    </View>
                </View>

                {/* Drafts Section */}
                {drafts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Drafts</Text>
                        <View style={styles.grid}>
                            {drafts.map(story => (
                                <View key={story.id} style={styles.cardWrapper}>
                                    <WriterStoryCard
                                        story={story}
                                        onDelete={handleDelete}
                                        onPublish={handlePublish}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Published Section */}
                {published.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Published Stories</Text>
                        <View style={styles.grid}>
                            {published.map(story => (
                                <View key={story.id} style={styles.cardWrapper}>
                                    <WriterStoryCard
                                        story={story}
                                        onDelete={handleDelete}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Empty State */}
                {stories.length === 0 && (
                    <View style={styles.emptyState}>
                        <FilePlus size={64} color="#ccc" />
                        <Text style={styles.emptyTitle}>No stories yet</Text>
                        <Text style={styles.emptyText}>Start writing your first story!</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={handleNewStory}>
                            <Text style={styles.emptyBtnText}>Create Story</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F7F1',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9F7F1',
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        fontFamily: 'serif',
        color: '#222',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FF6B35',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    newBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    stats: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 8,
        color: '#222',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'serif',
        marginBottom: 16,
        color: '#222',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    cardWrapper: {
        width: '100%',
        maxWidth: 300,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 16,
        color: '#666',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 8,
        marginBottom: 24,
    },
    emptyBtn: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 8,
    },
    emptyBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});

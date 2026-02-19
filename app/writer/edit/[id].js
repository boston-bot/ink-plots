import { View, Text, ScrollView, TextInput, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator, Alert, useWindowDimensions, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Save, Send, Upload, FileText } from 'lucide-react-native';
import CustomHeader from '../../../components/CustomHeader';
import { getWriterStory, updateStory, publishStory, uploadFile, parseFile, API_URL } from '../../../lib/api';
import { saveDraft, getDraft, removeDraft } from '../../../lib/offline';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../../lib/theme';

const GENRES = ['Sci-Fi', 'Thriller', 'Drama', 'Fantasy', 'Romance', 'Mystery', 'Horror', 'Adventure'];

export default function StoryEditor() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 1024;
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [uploading, setUploading] = useState(false);

    const titleRef = useRef(null);

    const saveTimeout = useRef(null);

    useEffect(() => {
        loadStory();
    }, [id]);

    const loadStory = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                router.replace('/auth/login');
                return;
            }

            // 1. Fetch Server Data
            let serverStory = null;
            try {
                serverStory = await getWriterStory(id, token);
            } catch (err) {
                console.warn('Server load failed, trying offline draft...');
            }

            // 2. Fetch Local Draft
            const localDraft = await getDraft(id);

            // 3. Conflict Resolution / Fallback
            if (localDraft) {
                const localTime = localDraft.local_updated_at || 0;
                const serverTime = serverStory ? new Date(serverStory.updated_at).getTime() : 0;

                if (!serverStory || localTime > serverTime) {
                    // Local is newer or server failed
                    if (Platform.OS === 'web') {
                        if (confirm(`Found a local draft from ${new Date(localTime).toLocaleTimeString()}. Restore it?`)) {
                            setStory(localDraft);
                            setLoading(false);
                            return;
                        } else if (serverStory) {
                            await removeDraft(id);
                        }
                    } else {
                        Alert.alert(
                            'Unsaved Changes',
                            `Found a local draft from ${new Date(localTime).toLocaleTimeString()}. Restore?`,
                            [
                                {
                                    text: 'Discard',
                                    style: 'destructive',
                                    onPress: async () => {
                                        if (serverStory) {
                                            setStory(serverStory);
                                            await removeDraft(id);
                                        }
                                    }
                                },
                                {
                                    text: 'Restore',
                                    onPress: () => setStory(localDraft)
                                }
                            ]
                        );
                        // If server story exists, show it pending decision
                        if (serverStory) setStory(serverStory);
                        setLoading(false);
                        return;
                    }
                } else {
                    // Server is newer
                    await removeDraft(id);
                }
            }

            if (serverStory) {
                setStory(serverStory);
            } else {
                throw new Error('Could not load story');
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to load story:', error);
            Alert.alert('Error', 'Failed to load story. Please check your connection.');
            router.back();
        }
    };

    const handleChange = (field, value) => {
        setStory(prev => {
            const updated = { ...prev, [field]: value };
            // Immediate local save
            saveDraft(id, updated).catch(e => console.warn(e));
            return updated;
        });

        // Auto-save to server after 2 seconds
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
            saveStory({ [field]: value });
        }, 2000);
    };

    const saveStory = async (updates = {}) => {
        try {
            setSaving(true);
            const token = await AsyncStorage.getItem('userToken');
            const dataToSave = Object.keys(updates).length > 0 ? updates : {
                title: story.title,
                description: story.description,
                genre: story.genre,
                tags: story.tags,
                content_text: story.content_text,
                content_type: story.content_type,
            };

            console.log('Saving story data:', dataToSave);
            await updateStory(id, dataToSave, token);

            setLastSaved(new Date());
            setSaving(false);
        } catch (error) {
            console.error('Failed to save story:', error);
            setSaving(false);
        }
    };

    const handlePublish = async (newStatus = 'published') => {
        console.log('=== HANDLE PUBLISH CALLED ===');
        console.log('New status:', newStatus);
        console.log('Platform:', Platform.OS);

        if (!story.title || !story.content_text) {
            if (Platform.OS === 'web') {
                alert('Please add a title and content before publishing.');
            } else {
                Alert.alert('Incomplete Story', 'Please add a title and content before publishing.');
            }
            return;
        }

        const label = newStatus === 'wip' ? 'Work in Progress' : 'Final Story';

        const confirmPublish = Platform.OS === 'web'
            ? window.confirm(`Are you sure you want to publish as ${label}? This will make your story visible to readers.`)
            : await new Promise((resolve) => {
                Alert.alert(
                    `Publish as ${label}`,
                    `Are you sure? This will make your story visible to readers as a ${label}.`,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                        {
                            text: 'Publish',
                            onPress: () => resolve(true)
                        }
                    ]
                );
            });

        if (confirmPublish) {
            try {
                const token = await AsyncStorage.getItem('userToken');

                const res = await fetch(`${API_URL}/api/writer/stories/${id}/publish`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!res.ok) throw new Error('Failed to update status');

                if (Platform.OS === 'web') {
                    alert(`Story published as ${label}!`);
                } else {
                    Alert.alert('Success!', `Story published as ${label}.`, [
                        { text: 'OK', onPress: () => loadStory() }
                    ]);
                }

                loadStory(); // Reload to update UI
            } catch (error) {
                console.error('Publish error:', error);
                if (Platform.OS === 'web') {
                    alert(error.message || 'Failed to publish story');
                } else {
                    Alert.alert('Error', error.message || 'Failed to publish story');
                }
            }
        }
    };

    if (loading || !story) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#FF6B35" />
            </View>
        );
    }

    const isDark = Platform.OS !== 'web';
    const headerTextColor = isDark ? '#FFFFFF' : '#000000';
    const headerBgColor = isDark ? '#121212' : '#F9F7F1';

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <CustomHeader />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={isLargeScreen ? styles.threePanel : styles.singlePanel}>
                    {/* Left Panel - Metadata */}
                    <View style={[styles.panel, styles.leftPanel, !isLargeScreen && styles.fullWidth]}>
                        <Text style={styles.panelTitle}>Story Details</Text>

                        {/* Content Type Selector */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Type</Text>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    style={[styles.typeOption, (story.content_type || 'story') === 'story' && styles.typeActive]}
                                    onPress={() => handleChange('content_type', 'story')}
                                >
                                    <Text style={[styles.typeOptionText, (story.content_type || 'story') === 'story' && styles.typeActiveText]}>
                                        📝 Story
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeOption, story.content_type === 'book' && styles.typeActive]}
                                    onPress={() => handleChange('content_type', 'book')}
                                >
                                    <Text style={[styles.typeOptionText, story.content_type === 'book' && styles.typeActiveText]}>
                                        📚 Book
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {story.content_type === 'book' && (
                                <Text style={styles.hint}>Chapter editor coming soon. For now, write in the main editor.</Text>
                            )}
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Title *</Text>
                            <TextInput
                                style={styles.input}
                                value={story.title}
                                onChangeText={(val) => handleChange('title', val)}
                                placeholder="Untitled Story"
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Genre</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
                                {GENRES.map(genre => (
                                    <TouchableOpacity
                                        key={genre}
                                        style={[styles.genreChip, story.genre === genre && styles.genreActive]}
                                        onPress={() => handleChange('genre', genre)}
                                    >
                                        <Text style={[styles.genreText, story.genre === genre && styles.genreTextActive]}>
                                            {genre}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={story.description || ''}
                                onChangeText={(val) => handleChange('description', val)}
                                placeholder="A brief description of your story..."
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Tags</Text>
                            <TextInput
                                style={styles.input}
                                value={story.tags || ''}
                                onChangeText={(val) => handleChange('tags', val)}
                                placeholder="indie, short-story, fiction"
                            />
                            <Text style={styles.hint}>Separate with commas</Text>
                        </View>

                        {/* Cover Upload Placeholder */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Cover Image</Text>
                            <TouchableOpacity style={styles.uploadBtn}>
                                <Upload size={20} color="#666" />
                                <Text style={styles.uploadText}>Upload Cover</Text>
                            </TouchableOpacity>
                            <Text style={styles.hint}>Coming soon</Text>
                        </View>
                    </View>

                    {/* Center Panel - Content Editor */}
                    <View style={[styles.panel, styles.centerPanel, !isLargeScreen && styles.fullWidth]}>
                        <Text style={styles.panelTitle}>Story Content *</Text>

                        <TextInput
                            style={[styles.input, styles.contentEditor]}
                            value={story.content_text || ''}
                            onChangeText={(val) => handleChange('content_text', val)}
                            placeholder="Start writing your story here..."
                            multiline
                            textAlignVertical="top"
                        />

                        <View style={styles.wordCount}>
                            <Text style={styles.wordCountText}>
                                {story.content_text ? story.content_text.split(/\s+/).filter(Boolean).length : 0} words
                                {story.reading_time && ` • ~${story.reading_time} min read`}
                            </Text>
                        </View>
                    </View>

                    {/* Right Panel - Publishing Options */}
                    <View style={[styles.panel, styles.rightPanel, !isLargeScreen && styles.fullWidth]}>
                        <Text style={styles.panelTitle}>Publishing</Text>

                        {/* Status Display / Toggle */}
                        <View style={styles.statusBox}>
                            <Text style={styles.statusLabel}>Status</Text>
                            {(story.status === 'published' || story.status === 'wip') ? (
                                <View style={styles.toggleContainer}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, story.status === 'wip' && styles.toggleBtnActive]}
                                        onPress={() => story.status !== 'wip' && handlePublish('wip')}
                                    >
                                        <Text style={[styles.toggleText, story.status === 'wip' && styles.toggleTextActive]}>WIP</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, story.status === 'published' && styles.toggleBtnActive]}
                                        onPress={() => story.status !== 'published' && handlePublish('published')}
                                    >
                                        <Text style={[styles.toggleText, story.status === 'published' && styles.toggleTextActive]}>Final</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={[styles.statusBadge, { backgroundColor: '#999' }]}>
                                    <Text style={styles.statusText}>{story.status}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.saveInfo}>
                            <Save size={16} color={saving ? '#FFA500' : '#4CAF50'} />
                            <Text style={styles.saveText}>
                                {saving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Auto-save enabled'}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={() => saveStory()}>
                            <Save size={18} color="#333" />
                            <Text style={styles.saveBtnText}>Save Draft</Text>
                        </TouchableOpacity>

                        {story.status === 'draft' && (
                            <View style={{ gap: 10 }}>
                                {Platform.OS === 'web' ? (
                                    <>
                                        <button
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                padding: '12px 20px',
                                                backgroundColor: '#FFA500',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontSize: 16,
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => {
                                                console.log('WIP button clicked');
                                                handlePublish('wip');
                                            }}
                                        >
                                            <Upload size={18} color="#fff" />
                                            <span style={{ color: '#fff' }}>Publish as WIP</span>
                                        </button>

                                        <button
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                padding: '12px 20px',
                                                backgroundColor: '#4CAF50',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontSize: 16,
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => {
                                                console.log('Final button clicked');
                                                handlePublish('published');
                                            }}
                                        >
                                            <Send size={18} color="#fff" />
                                            <span style={{ color: '#fff' }}>Publish Final</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Pressable style={[styles.publishBtn, { backgroundColor: '#FFA500' }]} onPress={() => handlePublish('wip')}>
                                            <Upload size={18} color="#fff" />
                                            <Text style={styles.publishBtnText}>Publish as WIP</Text>
                                        </Pressable>

                                        <Pressable style={styles.publishBtn} onPress={() => handlePublish('published')}>
                                            <Send size={18} color="#fff" />
                                            <Text style={styles.publishBtnText}>Publish Final</Text>
                                        </Pressable>
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    threePanel: {
        flexDirection: 'row',
        gap: 20,
    },
    singlePanel: {
        gap: 20,
    },
    panel: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    fullWidth: {
        width: '100%',
    },
    leftPanel: {
        flex: 1,
        maxWidth: 300,
    },
    centerPanel: {
        flex: 2,
    },
    rightPanel: {
        flex: 1,
        maxWidth: 280,
    },
    panelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'serif',
        marginBottom: 20,
        color: '#222',
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#444',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        backgroundColor: '#fafafa',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    contentEditor: {
        minHeight: 400,
        flex: 1,
        fontFamily: 'serif',
        fontSize: 16,
        lineHeight: 24,
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    genreScroll: {
        flexDirection: 'row',
    },
    genreChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        marginRight: 8,
        backgroundColor: '#fff',
    },
    genreActive: {
        backgroundColor: '#FF6B35',
        borderColor: '#FF6B35',
    },
    genreText: {
        fontSize: 13,
        color: '#666',
    },
    genreTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 10,
    },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    typeActive: {
        backgroundColor: '#FF6B35',
        borderColor: '#FF6B35',
    },
    typeOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    typeActiveText: {
        color: '#fff',
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        borderStyle: 'dashed',
        justifyContent: 'center',
    },
    uploadText: {
        fontSize: 14,
        color: '#666',
    },
    wordCount: {
        marginTop: 12,
        alignItems: 'flex-end',
    },
    wordCountText: {
        fontSize: 13,
        color: '#999',
    },
    statusBox: {
        marginBottom: 16,
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#444',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    saveInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 6,
    },
    saveText: {
        fontSize: 13,
        color: '#666',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 12,
    },
    saveBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    publishBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        backgroundColor: '#4CAF50',
        borderRadius: 8,
    },
    publishBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    publishedInfo: {
        padding: 16,
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
        alignItems: 'center',
    },
    publishedText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4CAF50',
        marginBottom: 4,
    },
    publishedDate: {
        fontSize: 13,
        color: '#666',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#eee',
        borderRadius: 8,
        padding: 2,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
    },
    toggleBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    toggleTextActive: {
        color: '#222',
        fontWeight: 'bold',
    },
});

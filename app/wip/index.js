import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { BookOpen, User, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';
import { API_URL } from '../../lib/api';
import CustomHeader from '../../components/CustomHeader';

export default function WIPFeed() {
    const { theme } = useTheme();
    const router = useRouter();
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadWIPStories();
    }, []);

    const loadWIPStories = async () => {
        try {
            const res = await fetch(`${API_URL}/api/wip`);
            if (res.ok) {
                const data = await res.json();
                setStories(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadWIPStories();
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Stack.Screen options={{ headerShown: false }} />
            <CustomHeader title="Works In Progress" />

            <ScrollView
                style={{ flex: 1, padding: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {/* Description */}
                <View style={{ marginBottom: 20, padding: 16, backgroundColor: theme.surface, borderRadius: 12 }}>
                    <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>
                        Browse works in progress from writers in the community.
                        Read their drafts and provide feedback to help them improve!
                    </Text>
                </View>

                {/* Stories List */}
                {stories.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <BookOpen size={48} color={theme.textTertiary} />
                        <Text style={{ color: theme.textTertiary, marginTop: 16, fontSize: 16 }}>
                            No works in progress yet
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 16 }}>
                        {stories.map((story) => (
                            <TouchableOpacity
                                key={story.id}
                                style={{
                                    backgroundColor: theme.surface,
                                    borderRadius: 16,
                                    padding: 16,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                }}
                                onPress={() => router.push(`/read/${story.id}?storyType=story`)}
                            >
                                {/* Header */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: theme.primary,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12,
                                    }}>
                                        <User size={18} color="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                                            {story.author_name?.split('@')[0] || 'Anonymous'}
                                        </Text>
                                        <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
                                            Updated {formatDate(story.updated_at)}
                                        </Text>
                                    </View>
                                    <View style={{
                                        backgroundColor: theme.primary + '20',
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 12,
                                    }}>
                                        <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>WIP</Text>
                                    </View>
                                </View>

                                {/* Title & Synopsis */}
                                <Text style={{
                                    color: theme.text,
                                    fontSize: 18,
                                    fontWeight: 'bold',
                                    fontFamily: 'serif',
                                    marginBottom: 8,
                                }}>
                                    {story.title}
                                </Text>

                                {story.synopsis && (
                                    <Text
                                        style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}
                                        numberOfLines={3}
                                    >
                                        {story.synopsis}
                                    </Text>
                                )}

                                {/* Footer */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginTop: 16,
                                    paddingTop: 12,
                                    borderTopWidth: 1,
                                    borderTopColor: theme.border,
                                }}>
                                    {story.genre && (
                                        <View style={{
                                            backgroundColor: theme.textTertiary + '20',
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                            borderRadius: 8,
                                            marginRight: 12,
                                        }}>
                                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{story.genre}</Text>
                                        </View>
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MessageCircle size={14} color={theme.textTertiary} />
                                        <Text style={{ color: theme.textTertiary, fontSize: 12, marginLeft: 4 }}>
                                            Give Feedback
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

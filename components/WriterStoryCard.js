import { View, Text, TouchableOpacity, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Edit, Trash2, Send, BookOpen } from 'lucide-react-native';
import { useState } from 'react';
import { useTheme } from '../lib/theme';

export default function WriterStoryCard({ story, onDelete, onPublish }) {
    const { theme } = useTheme();
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const styles = getStyles(theme);

    const statusColors = {
        draft: '#FFA500',
        published: '#4CAF50',
        submitted: '#2196F3',
    };

    // Debug: Log story status
    console.log('WriterStoryCard rendering:', {
        id: story.id,
        title: story.title,
        status: story.status,
        isDraft: story.status === 'draft'
    });

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <View
            style={[styles.card, isHovered && Platform.OS === 'web' && styles.cardHovered]}
            onMouseEnter={() => Platform.OS === 'web' && setIsHovered(true)}
            onMouseLeave={() => Platform.OS === 'web' && setIsHovered(false)}
        >
            {/* Cover Preview - clickable to edit */}
            <Pressable
                style={[styles.cover, { backgroundColor: story.cover_color || '#E3F2FD' }]}
                onPress={() => router.push(`/writer/edit/${story.id}`)}
            >
                {story.cover_image_url ? (
                    <Text style={styles.coverPlaceholder}>Cover</Text>
                ) : (
                    <Text style={styles.coverTitle} numberOfLines={2}>{story.title}</Text>
                )}
            </Pressable>

            {/* Content */}
            <View style={styles.content}>
                {/* Header and Title - clickable to edit */}
                <Pressable onPress={() => router.push(`/writer/edit/${story.id}`)}>
                    <View style={styles.header}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColors[story.status] }]}>
                            <Text style={styles.statusText}>{story.status}</Text>
                        </View>
                        {story.reading_time && (
                            <View style={styles.timeTag}>
                                <Clock size={12} color="#666" />
                                <Text style={styles.timeText}>{story.reading_time} min</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.title} numberOfLines={2}>{story.title}</Text>

                    {/* Content Type Badge */}
                    <View style={[styles.typeBadge, { backgroundColor: story.content_type === 'book' ? '#6A4C93' : '#FF6B35' }]}>
                        <Text style={styles.typeText}>{story.content_type === 'book' ? '📚 Book' : '📝 Story'}</Text>
                    </View>

                    {story.genre && <Text style={styles.genre}>{story.genre}</Text>}
                    <Text style={styles.date}>Updated {formatDate(story.updated_at)}</Text>
                </Pressable>

                {/* Actions - standalone buttons, no parent interference */}
                <View style={styles.actions}>
                    <Pressable
                        style={styles.actionBtn}
                        onPress={() => {
                            router.push(`/read/${story.id}?storyType=story`);
                        }}
                    >
                        <BookOpen size={16} color="#2196F3" />
                        <Text style={[styles.actionText, { color: '#2196F3' }]}>Read</Text>
                    </Pressable>

                    <Pressable
                        style={styles.actionBtn}
                        onPress={() => {
                            router.push(`/writer/edit/${story.id}`);
                        }}
                    >
                        <Edit size={16} color="#666" />
                        <Text style={styles.actionText}>Edit</Text>
                    </Pressable>

                    {story.status === 'draft' && (
                        (() => {
                            console.log('Rendering publish button for story:', story.id, 'Platform:', Platform.OS);
                            return Platform.OS === 'web' ? (
                                <button
                                    style={{
                                        ...styles.actionBtn,
                                        ...styles.publishBtn,
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                        border: '2px solid red',
                                        background: 'rgba(255,0,0,0.2)',
                                        cursor: 'pointer',
                                        padding: '6px 10px',
                                    }}
                                    onClick={(e) => {
                                        console.log('=== CLICK EVENT FIRED ===', e);
                                        console.log('=== PUBLISH BUTTON CLICKED (WEB) ===');
                                        console.log('Story ID:', story.id);
                                        console.log('onPublish exists?', !!onPublish);
                                        if (onPublish) {
                                            console.log('Calling onPublish...');
                                            onPublish(story.id);
                                        } else {
                                            console.error('onPublish is not defined!');
                                        }
                                    }}
                                >
                                    <Send size={16} color="#4CAF50" />
                                    <Text style={[styles.actionText, { color: '#4CAF50' }]}>Publish [DEBUG]</Text>
                                </button>
                            ) : (
                                <Pressable
                                    style={[styles.actionBtn, styles.publishBtn]}
                                    onPress={() => {
                                        console.log('=== PUBLISH BUTTON CLICKED ===');
                                        console.log('Story ID:', story.id);
                                        console.log('onPublish exists?', !!onPublish);
                                        console.log('onPublish type:', typeof onPublish);
                                        if (onPublish) {
                                            console.log('Calling onPublish...');
                                            onPublish(story.id);
                                        } else {
                                            console.error('onPublish is not defined!');
                                        }
                                    }}
                                >
                                    <Send size={16} color="#4CAF50" />
                                    <Text style={[styles.actionText, { color: '#4CAF50' }]}>Publish</Text>
                                </Pressable>
                            );
                        })()
                    )}

                    <Pressable
                        style={styles.actionBtn}
                        onPress={() => {
                            onDelete && onDelete(story.id);
                        }}
                    >
                        <Trash2 size={16} color="#E63946" />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    card: {
        backgroundColor: theme.cardBg,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 2,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        transition: Platform.OS === 'web' ? 'all 0.3s ease' : undefined,
    },
    cardHovered: {
        elevation: 6,
        shadowOpacity: 0.2,
        transform: Platform.OS === 'web' ? [{ translateY: -2 }] : undefined,
    },
    cover: {
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    coverTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        fontFamily: 'serif',
    },
    coverPlaceholder: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'serif',
    },
    content: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        color: '#666',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        fontFamily: 'serif',
        color: '#222',
    },
    genre: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
        fontStyle: 'italic',
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 6,
    },
    typeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    publishBtn: {
        flex: 1,
    },
    actionText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
});

import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Edit, Trash2, Send } from 'lucide-react-native';
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

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <TouchableOpacity
            style={[styles.card, isHovered && Platform.OS === 'web' && styles.cardHovered]}
            onPress={() => router.push(`/writer/edit/${story.id}`)}
            onMouseEnter={() => Platform.OS === 'web' && setIsHovered(true)}
            onMouseLeave={() => Platform.OS === 'web' && setIsHovered(false)}
            activeOpacity={0.9}
        >
            {/* Cover Preview */}
            <View style={[styles.cover, { backgroundColor: story.cover_color || '#E3F2FD' }]}>
                {story.cover_image_url ? (
                    <Text style={styles.coverPlaceholder}>Cover</Text>
                ) : (
                    <Text style={styles.coverTitle} numberOfLines={2}>{story.title}</Text>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
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

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/writer/edit/${story.id}`);
                        }}
                    >
                        <Edit size={16} color="#666" />
                        <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>

                    {story.status === 'draft' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.publishBtn]}
                            onPress={(e) => {
                                e.stopPropagation();
                                onPublish && onPublish(story.id);
                            }}
                        >
                            <Send size={16} color="#4CAF50" />
                            <Text style={[styles.actionText, { color: '#4CAF50' }]}>Publish</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={(e) => {
                            e.stopPropagation();
                            onDelete && onDelete(story.id);
                        }}
                    >
                        <Trash2 size={16} color="#E63946" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
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

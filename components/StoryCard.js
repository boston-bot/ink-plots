import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { useState } from 'react';
import { useTheme } from '../lib/theme';

export default function StoryCard({ story, getImageUrl }) {
    const { theme } = useTheme();
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const styles = getStyles(theme);

    const excerpt = story.content ? story.content.substring(0, 120) + '...' : '';

    return (
        <TouchableOpacity
            style={[
                styles.card,
                isHovered && Platform.OS === 'web' && styles.cardHovered
            ]}
            onPress={() => router.push(`/read/${story.id}`)}
            onMouseEnter={() => Platform.OS === 'web' && setIsHovered(true)}
            onMouseLeave={() => Platform.OS === 'web' && setIsHovered(false)}
            activeOpacity={0.9}
        >
            {/* Cover Section */}
            <View style={[styles.cover, { backgroundColor: story.cover_color || '#FF8A80' }]}>
                {!story.cover_image_url && (
                    <Text style={styles.coverTitle} numberOfLines={3}>{story.title}</Text>
                )}
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                <View style={styles.meta}>
                    {story.genre && (
                        <View style={[styles.genreBadge, { backgroundColor: getGenreColor(story.genre) }]}>
                            <Text style={styles.genreText}>{story.genre}</Text>
                        </View>
                    )}
                    {story.reading_time && (
                        <View style={styles.timeTag}>
                            <Clock size={12} color="#666" />
                            <Text style={styles.timeText}>{story.reading_time} min</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
                <Text style={styles.author}>by {story.author}</Text>

                {/* Excerpt - shown on hover */}
                {isHovered && Platform.OS === 'web' && (
                    <Text style={styles.excerpt}>{excerpt}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

function getGenreColor(genre) {
    const colors = {
        'Sci-Fi': '#4ECDC4',
        'Thriller': '#E63946',
        'Drama': '#F4A261',
        'Cyberpunk': '#9D4EDD',
        'Fantasy': '#06FFA5',
        'Mystery': '#264653',
        'Romance': '#F72585',
    };
    return colors[genre] || '#888';
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
        elevation: 8,
        shadowOpacity: 0.25,
        shadowRadius: 12,
        transform: Platform.OS === 'web' ? [{ translateY: -4 }] : undefined,
    },
    cover: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    coverTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        fontFamily: 'serif',
    },
    content: {
        padding: 16,
    },
    meta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    genreBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    genreText: {
        color: '#fff',
        fontSize: 11,
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
        fontSize: 12,
        color: theme.textSecondary,
        fontFamily: 'serif',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        fontFamily: 'serif',
        color: theme.text,
    },
    author: {
        fontSize: 14,
        color: theme.textSecondary,
        fontStyle: 'italic',
        fontFamily: 'serif',
        marginBottom: 8,
    },
    excerpt: {
        fontSize: 13,
        color: theme.textSecondary,
        lineHeight: 19,
        fontFamily: 'serif',
        marginTop: 8,
        fontStyle: 'italic',
    },
});

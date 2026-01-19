import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Sparkles } from 'lucide-react-native';

export default function FeaturedStory({ story, getImageUrl }) {
    const router = useRouter();

    if (!story) return null;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => router.push(`/read/${story.id}`)}
            activeOpacity={0.95}
        >
            <View style={styles.card}>
                {story.cover_image_url ? (
                    <ImageBackground
                        source={{ uri: getImageUrl(story.cover_image_url) }}
                        style={styles.imageBackground}
                        imageStyle={{ borderRadius: 12 }}
                    >
                        <View style={styles.gradient} />
                        <View style={styles.content}>
                            <View style={styles.header}>
                                <View style={styles.badge}>
                                    <Sparkles size={14} color="#FFA500" />
                                    <Text style={styles.badgeText}>Featured</Text>
                                </View>
                                {story.reading_time && (
                                    <View style={styles.timeContainer}>
                                        <Clock size={14} color="rgba(255,255,255,0.9)" />
                                        <Text style={styles.timeText}>{story.reading_time} min read</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.textContent}>
                                <Text style={styles.title}>{story.title}</Text>
                                <Text style={styles.author}>by {story.author}</Text>
                                {story.genre && (
                                    <View style={[styles.genreTag, { backgroundColor: getGenreColor(story.genre) }]}>
                                        <Text style={styles.genreText}>{story.genre}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ImageBackground>
                ) : (
                    <View style={[styles.imageBackground, { backgroundColor: story.cover_color || '#FF6B6B' }]}>
                        <View style={styles.gradient} />
                        <View style={styles.content}>
                            <View style={styles.header}>
                                <View style={styles.badge}>
                                    <Sparkles size={14} color="#FFA500" />
                                    <Text style={styles.badgeText}>Featured</Text>
                                </View>
                                {story.reading_time && (
                                    <View style={styles.timeContainer}>
                                        <Clock size={14} color="rgba(255,255,255,0.9)" />
                                        <Text style={styles.timeText}>{story.reading_time} min read</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.textContent}>
                                <Text style={styles.title}>{story.title}</Text>
                                <Text style={styles.author}>by {story.author}</Text>
                                {story.genre && (
                                    <View style={[styles.genreTag, { backgroundColor: getGenreColor(story.genre) }]}>
                                        <Text style={styles.genreText}>{story.genre}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
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

const styles = StyleSheet.create({
    container: {
        marginBottom: 30,
    },
    card: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    imageBackground: {
        height: 280,
        justifyContent: 'flex-end',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    content: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,165,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    badgeText: {
        color: '#FFA500',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontFamily: 'serif',
    },
    textContent: {
        gap: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: 'serif',
        lineHeight: 34,
    },
    author: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'serif',
        fontStyle: 'italic',
    },
    genreTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginTop: 8,
    },
    genreText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});

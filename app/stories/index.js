import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, useWindowDimensions, Modal, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/api';
import { Filter } from 'lucide-react-native';
import CustomHeader from '../../components/CustomHeader';
import FeaturedStory from '../../components/FeaturedStory';
import StoryCard from '../../components/StoryCard';
import SidebarFilters from '../../components/SidebarFilters';
import { useTheme } from '../../lib/theme';

export default function StoriesPage() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 768;
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [readingTime, setReadingTime] = useState(null);
    const [sortBy, setSortBy] = useState('newest');
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            const res = await fetch(`${API_URL}/api/books?type=story`);
            const data = await res.json();
            setStories(data);
            setLoading(false);
        } catch (e) {
            console.error("Failed to load stories", e);
            setLoading(false);
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

    // Filter and sort stories
    const filteredStories = stories
        .filter(story => {
            if (selectedGenre && story.genre !== selectedGenre) return false;
            if (readingTime) {
                if (readingTime === 5 && story.reading_time >= 5) return false;
                if (readingTime === 10 && (story.reading_time < 5 || story.reading_time > 10)) return false;
                if (readingTime === 15 && story.reading_time < 10) return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return b.id - a.id;
            if (sortBy === 'popular') return (b.read_count || 0) - (a.read_count || 0);
            if (sortBy === 'random') return Math.random() - 0.5;
            return 0;
        });

    const featuredStory = filteredStories.find(s => s.is_featured) || filteredStories[0];
    const gridStories = filteredStories.filter(s => s.id !== featuredStory?.id);
    const genres = [...new Set(stories.map(s => s.genre))].filter(Boolean);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <CustomHeader />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Page Header */}
                <View style={styles.pageHeader}>
                    <View>
                        <Text style={styles.pageTitle}>Short Stories</Text>
                        <Text style={styles.pageSubtitle}>Quick reads for curious minds</Text>
                    </View>
                    {!isLargeScreen && (
                        <TouchableOpacity
                            style={styles.mobileFilterBtn}
                            onPress={() => setShowMobileFilters(true)}
                        >
                            <Filter size={20} color={theme.text} />
                            <Text style={styles.filterBtnText}>Filter</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Main Layout */}
                <View style={isLargeScreen ? styles.twoColumn : styles.singleColumn}>
                    {/* Sidebar - Desktop Only */}
                    {isLargeScreen && (
                        <View style={styles.sidebar}>
                            <SidebarFilters
                                genres={genres}
                                selectedGenre={selectedGenre}
                                setSelectedGenre={setSelectedGenre}
                                readingTime={readingTime}
                                setReadingTime={setReadingTime}
                                sortBy={sortBy}
                                setSortBy={setSortBy}
                            />
                        </View>
                    )}

                    {/* Main Content */}
                    <View style={styles.mainContent}>
                        {/* Featured Story */}
                        {featuredStory && (
                            <FeaturedStory story={featuredStory} getImageUrl={getImageUrl} />
                        )}

                        {/* Story Grid */}
                        <View style={styles.grid}>
                            {gridStories.map(story => (
                                <View
                                    key={story.id}
                                    style={[
                                        styles.gridItem,
                                        isLargeScreen && { width: '48%' }
                                    ]}
                                >
                                    <StoryCard story={story} getImageUrl={getImageUrl} />
                                </View>
                            ))}
                        </View>

                        {filteredStories.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No stories match your filters.</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedGenre(null);
                                        setReadingTime(null);
                                    }}
                                    style={styles.resetBtn}
                                >
                                    <Text style={styles.resetText}>Clear Filters</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Mobile Filter Modal */}
            {!isLargeScreen && (
                <Modal
                    visible={showMobileFilters}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowMobileFilters(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <SidebarFilters
                                genres={genres}
                                selectedGenre={selectedGenre}
                                setSelectedGenre={setSelectedGenre}
                                readingTime={readingTime}
                                setReadingTime={setReadingTime}
                                sortBy={sortBy}
                                setSortBy={setSortBy}
                                onClose={() => setShowMobileFilters(false)}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        fontFamily: 'serif',
        color: theme.text,
    },
    pageSubtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        fontStyle: 'italic',
        fontFamily: 'serif',
        marginTop: 4,
    },
    mobileFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.surface,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    filterBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.text,
    },
    twoColumn: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 30,
    },
    singleColumn: {
        paddingHorizontal: 20,
    },
    sidebar: {
        width: 260,
        flexShrink: 0,
    },
    mainContent: {
        flex: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginTop: 10,
    },
    gridItem: {
        width: '100%',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: theme.textSecondary,
        fontFamily: 'serif',
        marginBottom: 16,
    },
    resetBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: theme.primary,
        borderRadius: 8,
    },
    resetText: {
        color: '#fff',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
});

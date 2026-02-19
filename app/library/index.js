import { View, Text, TextInput, Image, TouchableOpacity, ScrollView, StyleSheet, Platform, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../../lib/api';
import { ChevronLeft, Search, Heart } from 'lucide-react-native';
import HeaderProfile from '../../components/HeaderProfile';
import CustomHeader from '../../components/CustomHeader';
import { useTheme } from '../../lib/theme';
import { useFocusEffect } from '@react-navigation/native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { startReading, getReadings } from '../../lib/api';
import Hero from '../../components/Hero';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Formatter for like counts
const formatLikes = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

export default function Library() {
    const { theme } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);
    const [books, setBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [featuredBook, setFeaturedBook] = useState(null);
    const [readingBookIds, setReadingBookIds] = useState(new Set());
    const [isScrollingDown, setIsScrollingDown] = useState(false);
    const lastScrollY = useRef(0);
    const scrollViewRef = useRef(null);

    // Platform-specific scroll tracking
    useEffect(() => {
        if (Platform.OS === 'web' && scrollViewRef.current) {
            console.log('Setting up web scroll listener on ScrollView(library)');

            // Find the actual scrollable div element
            const scrollElement = scrollViewRef.current.getScrollableNode?.() || scrollViewRef.current;

            const handleScroll = (e) => {
                const currentScrollY = e.target.scrollTop || 0;
                const scrollDelta = currentScrollY - lastScrollY.current;
                const threshold = 5;

                if (scrollDelta > threshold && !isScrollingDown) {
                    setIsScrollingDown(true);
                } else if (scrollDelta < -threshold && isScrollingDown) {
                    setIsScrollingDown(false);
                }

                lastScrollY.current = currentScrollY;
            };

            scrollElement.addEventListener('scroll', handleScroll, { passive: true });
            return () => {
                scrollElement.removeEventListener('scroll', handleScroll);
            };
        }
    }, [isScrollingDown]);

    // Mobile scroll handler
    const handleScrollMobile = (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const scrollDelta = currentScrollY - lastScrollY.current;
        const threshold = 5;

        if (scrollDelta > threshold && !isScrollingDown) {
            setIsScrollingDown(true);
        } else if (scrollDelta < -threshold && isScrollingDown) {
            setIsScrollingDown(false);
        }

        lastScrollY.current = currentScrollY;
    };

    // Fetch books
    useEffect(() => {
        fetch(`${API_URL}/api/books`)
            .then(res => res.json())
            .then(data => {

                setBooks(data);
                setFilteredBooks(data);
                // Set featured book to first one
                if (data.length > 0) {
                    setFeaturedBook(data[0]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    // Check reading status on focus
    useFocusEffect(
        useCallback(() => {
            checkReadingStatus();
        }, [])
    );

    const checkReadingStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                const readings = await getReadings(token);
                const ids = new Set(readings.map(r => r.book_id));
                setReadingBookIds(ids);
            } else {
                setReadingBookIds(new Set());
            }
        } catch (e) {
            console.error("Failed to check reading status", e);
        }
    };

    // Search filter
    useEffect(() => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const result = books.filter(b =>
                b.title.toLowerCase().includes(q) ||
                b.author.toLowerCase().includes(q)
            );
            setFilteredBooks(result);
        } else {
            setFilteredBooks(books);
        }
    }, [searchQuery, books]);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.includes('localhost') && API_URL.includes('http')) {
            const apiHost = API_URL.split('://')[1].split(':')[0];
            return url.replace('localhost', apiHost);
        }
        return url;
    };

    const handleStartReading = async (bookId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                // Not logged in -> Redirect to Login
                router.push('/auth/login');
                return;
            }

            // Logged in -> Start Reading (Checkout) if not already reading
            // If already reading, it's just a "Continue" action which also leads to reader
            if (!readingBookIds.has(bookId)) {
                await startReading(bookId, token);
                // Update local state immediately so UI reflects it if we come back
                setReadingBookIds(prev => new Set(prev).add(bookId));
            }

            router.push(`/read/${bookId}`);
        } catch (e) {
            console.error("Failed to start reading", e);
            // Even if API fails (e.g. already reading), try to navigate
            router.push(`/read/${bookId}`);
        }
    };

    // Group books by genre
    const booksByGenre = filteredBooks.reduce((acc, book) => {
        const genre = book.genre || 'Uncategorized';
        if (!acc[genre]) acc[genre] = [];
        acc[genre].push(book);
        return acc;
    }, {});

    const insets = useSafeAreaInsets();

    if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.background }}><Text style={{ color: theme.text, textAlign: 'center' }}>Loading...</Text></View>;

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.container}
            showsVerticalScrollIndicator={false}
            onScroll={Platform.OS !== 'web' ? handleScrollMobile : undefined}
            scrollEventThrottle={16}
        >
            <Stack.Screen options={{ headerShown: false }} />

            <Hero isScrollingDown={isScrollingDown} />

            {/* Hero Banner */}
            {featuredBook && (
                <TouchableOpacity
                    onPress={() => handleStartReading(featuredBook.id)}
                    activeOpacity={0.95}
                >
                    <View style={styles.heroBanner}>
                        <Image
                            source={{ uri: getImageUrl(featuredBook.cover_image_url) }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                        <View style={styles.heroGradient}>
                            <View style={styles.heroContent}>
                                <Text style={styles.heroTag}>FEATURED</Text>
                                <Text style={styles.heroTitle}>{featuredBook.title}</Text>
                                <Text style={styles.heroAuthor}>by {featuredBook.author}</Text>
                                <View style={styles.heroRating}>
                                    <Heart size={16} color="#E91E63" fill="#E91E63" />
                                    <Text style={styles.heroRatingText}>{formatLikes(featuredBook.like_count)}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.heroButton}
                                    onPress={() => handleStartReading(featuredBook.id)}
                                >
                                    <Text style={styles.heroButtonText}>
                                        {readingBookIds.has(featuredBook.id) ? 'Continue Reading' : 'Start Reading'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Search color={theme.textSecondary} size={20} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search titles or authors..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.textSecondary}
                />
            </View>

            {/* Genre Rows */}
            {Object.keys(booksByGenre).map((genre) => (
                <View key={genre} style={styles.genreSection}>
                    <Text style={styles.genreTitle}>{genre}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.genreScroll}
                    >
                        {booksByGenre[genre].map((book) => (
                            <TouchableOpacity
                                key={book.id}
                                onPress={() => handleStartReading(book.id)}
                                style={styles.bookCard}
                                activeOpacity={0.9}
                            >
                                <View style={styles.bookCover}>
                                    {book.cover_image_url ? (
                                        <Image
                                            source={{ uri: getImageUrl(book.cover_image_url) }}
                                            style={styles.bookCoverImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.bookCoverPlaceholder, { backgroundColor: theme.surfaceVariant }]}>
                                            <Text style={styles.bookCoverTitle}>{book.title}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.bookInfo}>
                                    <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                                    <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
                                    <View style={styles.bookRating}>
                                        <Heart size={12} color="#E91E63" fill="#E91E63" />
                                        <Text style={styles.bookRatingText}>{formatLikes(book.like_count)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            ))}

            {books.length === 0 && !loading && (
                <Text style={styles.emptyText}>No books found.</Text>
            )}

            {/* Bottom padding */}
            <View style={{ height: 40 }} />
        </ScrollView>
    )
}


const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 15,
        zIndex: 1000,
    },
    headerLeft: {
        width: 40,
        alignItems: 'flex-start',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 40,
        alignItems: 'flex-end',
        zIndex: 1001,
    },
    backButton: {
        padding: 4,
        marginLeft: -8,
    },
    content: {
        flex: 1,
    },
    heroBanner: {
        width: SCREEN_WIDTH,
        height: 450,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        padding: 20,
    },
    heroContent: {
        marginBottom: 20,
    },
    heroTag: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 10,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
        lineHeight: 38,
    },
    heroAuthor: {
        color: '#FFFFFF',
        fontSize: 16,
        marginBottom: 12,
        opacity: 0.9,
    },
    heroRating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    heroRatingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 6,
    },
    heroButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    heroButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '700',
    },
    searchContainer: {
        marginHorizontal: 20,
        marginVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: 25,
        paddingHorizontal: 20,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: theme.border,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: theme.text,
        fontWeight: '500',
    },
    genreSection: {
        marginBottom: 30,
    },
    genreTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.text,
        marginLeft: 20,
        marginBottom: 15,
    },
    genreScroll: {
        paddingLeft: 20,
        paddingRight: 10,
    },
    bookCard: {
        width: 120,
        marginRight: 15,
    },
    bookCover: {
        width: 120,
        height: 180,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    bookCoverImage: {
        width: '100%',
        height: '100%',
    },
    bookCoverPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    bookCoverTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.text,
        textAlign: 'center',
    },
    bookInfo: {
        paddingHorizontal: 2,
    },
    bookTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.text,
        marginBottom: 4,
        lineHeight: 18,
    },
    bookAuthor: {
        fontSize: 12,
        color: theme.textSecondary,
        marginBottom: 6,
    },
    bookRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bookRatingText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.text,
        marginLeft: 4,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 60,
        color: theme.textSecondary,
        fontSize: 16,
    },
});

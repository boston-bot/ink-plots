import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/api';
import { ChevronLeft, Search } from 'lucide-react-native';
import HeaderProfile from '../../components/HeaderProfile';
import { useTheme } from '../../lib/theme';

export default function Library() {
    const { theme } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);
    const [books, setBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('All');

    // Fetch books
    useEffect(() => {
        fetch(`${API_URL}/api/books`)
            .then(res => res.json())
            .then(data => {
                setBooks(data);
                setFilteredBooks(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    // Filter Logic
    useEffect(() => {
        let result = books;

        // 1. Genre Filter
        if (selectedGenre !== 'All') {
            result = result.filter(b => b.genre === selectedGenre);
        }

        // 2. Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(b =>
                b.title.toLowerCase().includes(q) ||
                b.author.toLowerCase().includes(q)
            );
        }

        setFilteredBooks(result);
    }, [searchQuery, selectedGenre, books]);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.includes('localhost') && API_URL.includes('http')) {
            const apiHost = API_URL.split('://')[1].split(':')[0];
            return url.replace('localhost', apiHost);
        }
        return url;
    };

    const uniqueGenres = ['All', ...new Set(books.map(b => b.genre).filter(Boolean))];
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 768; // Web breakpoint

    // Dynamic Styles for Grid
    const cardStyle = isLargeScreen ? {
        width: 160,
        marginBottom: 30,
        marginRight: 20
    } : styles.card;

    const coverHeight = isLargeScreen ? 240 : 240; // Can reduce for web if dense, but 240 is fine

    // Web Grid Wrapper
    const gridStyle = isLargeScreen ? {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 40,
        justifyContent: 'flex-start' // Pack closely on web
    } : styles.grid;

    if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerTitle: () => (
                    <TouchableOpacity onPress={() => router.replace('/')}>
                        <Text style={{ fontFamily: 'serif', fontSize: 20, fontWeight: 'bold' }}>The Ink Plots</Text>
                    </TouchableOpacity>
                ),
                headerTitleAlign: 'center',
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/dashboard');
                            }
                        }}
                        style={{ marginLeft: -8, padding: 8 }}
                    >
                        <ChevronLeft color="#000" size={28} />
                    </TouchableOpacity>
                ),
                headerRight: () => <HeaderProfile />
            }} />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Search color="#999" size={20} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search title or author..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
            </View>

            {/* Genres */}
            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreList} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    {uniqueGenres.map(genre => (
                        <TouchableOpacity
                            key={genre}
                            onPress={() => setSelectedGenre(genre)}
                            style={[
                                styles.genreChip,
                                selectedGenre === genre && styles.genreChipActive
                            ]}
                        >
                            <Text style={[
                                styles.genreText,
                                selectedGenre === genre && styles.genreTextActive
                            ]}>{genre}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Grid */}
            <ScrollView contentContainerStyle={gridStyle}>
                {filteredBooks.map(book => (
                    <TouchableOpacity
                        key={book.id}
                        style={cardStyle}
                        onPress={() => router.push(`/read/${book.id}`)}
                    >
                        <View style={[styles.cardCover, { height: isLargeScreen ? 240 : 240, backgroundColor: book.cover_color || '#eee' }]}>
                            {book.cover_image_url ? (
                                <Image source={{ uri: getImageUrl(book.cover_image_url) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                                <View style={{ padding: 10 }}>
                                    <Text style={styles.cardCoverTitle}>{book.title}</Text>
                                </View>
                            )}
                        </View>
                        <Text numberOfLines={1} style={styles.cardTitle}>{book.title}</Text>
                        <Text numberOfLines={1} style={styles.cardAuthor}>{book.author}</Text>
                    </TouchableOpacity>
                ))}
                {filteredBooks.length === 0 && (
                    <Text style={{ textAlign: 'center', marginTop: 50, color: '#999', width: '100%' }}>No books found.</Text>
                )}
            </ScrollView>
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    searchContainer: {
        margin: 20,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'serif',
    },
    genreList: {
        marginBottom: 20,
        maxHeight: 50,
    },
    genreChip: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#eee',
        marginRight: 10,
    },
    genreChipActive: {
        backgroundColor: '#000',
    },
    genreText: {
        fontSize: 14,
        color: theme.textSecondary,
        fontWeight: '500',
    },
    genreTextActive: {
        color: '#fff',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 0,
    },
    card: {
        width: '48%',
        marginBottom: 20,
    },
    cardCover: {
        height: 240,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: '#ddd',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardCoverTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    cardTitle: {
        fontFamily: 'serif',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardAuthor: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'serif',
    },
});

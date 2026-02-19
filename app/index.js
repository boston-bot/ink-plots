import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import Hero from '../components/Hero';
import AnimatedEntry from '../components/AnimatedEntry';
import GenreSection from '../components/GenreSection';
import { useTheme } from '../lib/theme';
import { API_URL } from '../lib/api';

export default function Page() {
    const [featuredBooks, setFeaturedBooks] = useState([]);
    const { theme } = useTheme();
    const [isScrollingDown, setIsScrollingDown] = useState(false);
    const lastScrollY = useRef(0);
    const scrollViewRef = useRef(null);

    // Platform-specific scroll tracking
    useEffect(() => {
        if (Platform.OS === 'web' && scrollViewRef.current) {
            console.log('Setting up web scroll listener on ScrollView');

            // Find the actual scrollable div element
            const scrollElement = scrollViewRef.current.getScrollableNode?.() || scrollViewRef.current;

            const handleScroll = (e) => {
                const currentScrollY = e.target.scrollTop || 0;
                const scrollDelta = currentScrollY - lastScrollY.current;
                const threshold = 5;

                console.log('Scroll event (web):', { currentScrollY, lastScrollY: lastScrollY.current, scrollDelta, isScrollingDown });

                if (scrollDelta > threshold && !isScrollingDown) {
                    console.log('Setting isScrollingDown to TRUE');
                    setIsScrollingDown(true);
                } else if (scrollDelta < -threshold && isScrollingDown) {
                    console.log('Setting isScrollingDown to FALSE');
                    setIsScrollingDown(false);
                }

                lastScrollY.current = currentScrollY;
            };

            scrollElement.addEventListener('scroll', handleScroll, { passive: true });
            console.log('Web scroll listener added to ScrollView element');
            return () => {
                scrollElement.removeEventListener('scroll', handleScroll);
                console.log('Web scroll listener removed');
            };
        }
    }, [isScrollingDown]);

    // Mobile scroll handler
    const handleScrollMobile = (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const scrollDelta = currentScrollY - lastScrollY.current;
        const threshold = 5;

        console.log('Scroll event (mobile):', { currentScrollY, lastScrollY: lastScrollY.current, scrollDelta, isScrollingDown });

        if (scrollDelta > threshold && !isScrollingDown) {
            console.log('Setting isScrollingDown to TRUE');
            setIsScrollingDown(true);
        } else if (scrollDelta < -threshold && isScrollingDown) {
            console.log('Setting isScrollingDown to FALSE');
            setIsScrollingDown(false);
        }

        lastScrollY.current = currentScrollY;
    };

    useEffect(() => {
        fetch(`${API_URL}/api/books`)
            .then(res => res.json())
            .then(data => {
                const books = data;
                setFeaturedBooks(books);
            })
            .catch(err => console.error("Failed to fetch books", err));
    }, []);

    // Helper to fix localhost image URLs for devices
    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.includes('localhost') && API_URL.includes('http')) {
            const apiHost = API_URL.split('://')[1].split(':')[0];
            return url.replace('localhost', apiHost);
        }
        return url;
    };

    // Group books by Genre
    const booksByGenre = featuredBooks.reduce((acc, book) => {
        const genre = book.genre || 'Uncategorized';
        if (!acc[genre]) acc[genre] = [];
        acc[genre].push(book);
        return acc;
    }, {});

    return (
        <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ paddingBottom: 40, backgroundColor: theme.background, minHeight: '100%' }}
            onScroll={Platform.OS !== 'web' ? handleScrollMobile : undefined}
            scrollEventThrottle={16}
        >
            <Stack.Screen options={{ headerShown: false, title: 'Home' }} />

            <AnimatedEntry>
                <Hero isScrollingDown={isScrollingDown} />
            </AnimatedEntry>

            <View style={{ padding: 20, paddingLeft: 30 }}>
                {Object.keys(booksByGenre).map((genre, gIndex) => (
                    <GenreSection
                        key={genre}
                        title={genre}
                        books={booksByGenre[genre]}
                        getImageUrl={getImageUrl}
                        delay={400 + (gIndex * 200)}
                    />
                ))}
            </View>
        </ScrollView>
    );
}

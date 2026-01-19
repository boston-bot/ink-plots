import { useState, useEffect } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import Hero from '../components/Hero';
import AnimatedEntry from '../components/AnimatedEntry';
import GenreSection from '../components/GenreSection';
import { useTheme } from '../lib/theme';

import { API_URL } from '../lib/api';

export default function Page() {
    const [featuredBooks, setFeaturedBooks] = useState([]);
    const { theme } = useTheme();

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
        <ScrollView contentContainerStyle={{ paddingBottom: 40, backgroundColor: theme.background, minHeight: '100%' }}>
            <Stack.Screen options={{ headerShown: false, title: 'Home' }} />

            <AnimatedEntry>
                <Hero />
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

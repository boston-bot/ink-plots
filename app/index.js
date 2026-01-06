import { useState, useEffect } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import BookCard from '../components/BookCard';
import Hero from '../components/Hero';
import AnimatedEntry from '../components/AnimatedEntry';

export default function Page() {
    const [featuredBooks, setFeaturedBooks] = useState([]);

    useEffect(() => {
        // In a real app, use the api.js helper. 
        // For simplicity in this demo, accessing the endpoint directly.
        fetch('http://localhost:3000/api/books')
            .then(res => res.json())
            .then(data => {
                // Filter client-side or add ?featured=true query param to API
                setFeaturedBooks(data.filter(b => b.is_featured));
            })
            .catch(err => console.error("Failed to fetch books", err));
    }, []);

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#F9F7F1', minHeight: '100%' }}>
            <Stack.Screen options={{ headerShown: false }} />

            <AnimatedEntry>
                <Hero />
            </AnimatedEntry>

            <AnimatedEntry delay={400} style={{ marginTop: 20 }}>
                <Text style={{
                    fontSize: 14,
                    fontFamily: 'serif',
                    marginBottom: 30,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    textAlign: 'center'
                }}>
                    Featured This Week
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {featuredBooks.map((book, index) => (
                        <View key={book.id} style={{ width: '48%', marginBottom: 30 }}>
                            {/* Staggered animation for grid items */}
                            <AnimatedEntry delay={600 + (index * 200)}>
                                <BookCard
                                    id={book.id}
                                    title={book.title}
                                    author={book.author}
                                    coverColor={book.cover_color}
                                />
                            </AnimatedEntry>
                        </View>
                    ))}
                </View>
            </AnimatedEntry>
        </ScrollView>
    );
}

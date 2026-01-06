import { Text, View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import BookCard from '../components/BookCard';
import Hero from '../components/Hero';
import AnimatedEntry from '../components/AnimatedEntry';

export default function Page() {
    const featuredBooks = [
        { id: '1', title: 'The Silent Echo', author: 'Elena Fisher', color: '#f5f5f5' },
        { id: '2', title: 'Urban Shadows', author: 'Marcus Thorne', color: '#fafafa' },
        { id: '3', title: 'Neon Dreams', author: 'Sarah Jenkins', color: '#f0f0f0' },
    ];

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#fff', minHeight: '100%' }}>
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
                                    coverColor={book.color}
                                />
                            </AnimatedEntry>
                        </View>
                    ))}
                </View>
            </AnimatedEntry>
        </ScrollView>
    );
}

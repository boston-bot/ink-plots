import { Text, View, ScrollView, Pressable } from 'react-native';
import { Link, Stack } from 'expo-router';
import BookCard from '../components/BookCard';

export default function Page() {
    const featuredBooks = [
        { id: '1', title: 'The Silent Echo', author: 'Elena Fisher', color: '#e0f7fa' },
        { id: '2', title: 'Urban Shadows', author: 'Marcus Thorne', color: '#f3e5f5' },
        { id: '3', title: 'Neon Dreams', author: 'Sarah Jenkins', color: '#fff3e0' },
    ];

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#fff' }}>
            <Stack.Screen options={{ title: 'Ink Plots' }} />

            <View style={{ marginBottom: 40, marginTop: 20 }}>
                <Text style={{ fontSize: 32, fontFamily: 'serif', marginBottom: 10 }}>Curated Indie Press</Text>
                <Text style={{ fontSize: 16, fontFamily: 'serif', color: '#666', lineHeight: 24 }}>
                    Discover the best independent voices. Hand-picked, editorially managed, and designed for readers.
                </Text>
                <Link href="/submit" asChild>
                    <Pressable style={{ marginTop: 20, padding: 10, borderWidth: 1, borderColor: '#000', alignSelf: 'flex-start' }}>
                        <Text style={{ fontFamily: 'serif' }}>SUBMIT YOUR WORK</Text>
                    </Pressable>
                </Link>
            </View>

            <Text style={{ fontSize: 22, fontFamily: 'serif', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 }}>Featured Reads</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {featuredBooks.map(book => (
                    <View key={book.id} style={{ width: '48%', marginBottom: 20 }}>
                        <BookCard
                            id={book.id}
                            title={book.title}
                            author={book.author}
                            coverColor={book.color}
                        />
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

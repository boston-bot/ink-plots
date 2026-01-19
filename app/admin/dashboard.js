import { View, Text, Switch, FlatList, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/api'; // We need to export this or move it

export default function Dashboard() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBooks = async () => {
        try {
            // Direct fetch here for speed, or move to api.js
            // Assuming api.js might need refactoring to export URL or offer this method
            // For now, hardcoding localhost fetch based on previous pattern
            const response = await fetch('http://localhost:3000/api/books');
            const data = await response.json();
            setBooks(data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const toggleFeature = async (id, currentValue) => {
        try {
            await fetch(`http://localhost:3000/api/books/${id}/feature`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_featured: !currentValue })
            });
            // Optimistic update
            setBooks(books.map(b => b.id === id ? { ...b, is_featured: !currentValue } : b));
        } catch (e) {
            alert('Failed to update');
        }
    };

    useEffect(() => {
        fetchBooks();
    }, []);

    const renderItem = ({ item }) => (
        <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 15,
            borderBottomWidth: 1,
            borderBottomColor: '#eee'
        }}>
            <View>
                <Text style={{ fontFamily: 'serif', fontSize: 16 }}>{item.title}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>{item.author}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, marginBottom: 4 }}>FEATURED</Text>
                <Switch
                    value={item.is_featured}
                    onValueChange={() => toggleFeature(item.id, item.is_featured)}
                />
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <Stack.Screen options={{ title: 'Admin Dashboard' }} />
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                <Text style={{ fontFamily: 'serif', fontSize: 24 }}>Content Manager</Text>
            </View>

            {loading ? (
                <Text style={{ padding: 20 }}>Loading...</Text>
            ) : (
                <FlatList
                    data={books}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                />
            )}
        </View>
    );
}

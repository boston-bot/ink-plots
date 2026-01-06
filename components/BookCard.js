import { View, Text, Image, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function BookCard({ id, title, author, coverColor }) {
    return (
        <Link href={`/read/${id}`} asChild>
            <Pressable style={{ marginBottom: 20, width: '100%' }}>
                <View style={{
                    height: 200,
                    backgroundColor: coverColor || '#eee',
                    marginBottom: 10,
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    {/* Placeholder for cover image */}
                    <Text style={{ fontFamily: 'serif', fontSize: 40, opacity: 0.2 }}>{title[0]}</Text>
                </View>
                <Text style={{ fontFamily: 'serif', fontSize: 18, fontWeight: '600' }}>{title}</Text>
                <Text style={{ fontFamily: 'serif', fontSize: 14, color: '#555', marginTop: 4 }}>by {author}</Text>
            </Pressable>
        </Link>
    );
}

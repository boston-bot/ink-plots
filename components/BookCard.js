import { View, Text, Image, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function BookCard({ id, title, author, coverColor, coverImage }) {
    return (
        <Link href={`/read/${id}`} asChild>
            <Pressable style={({ pressed }) => ({
                width: 160,
                height: 280,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }]
            })}>
                <View style={{
                    height: 220,
                    backgroundColor: coverColor || '#eee',
                    marginBottom: 10,
                    borderRadius: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 8,
                    overflow: 'hidden',
                    borderLeftWidth: 4,
                    borderLeftColor: 'rgba(255,255,255,0.2)'
                }}>
                    {coverImage ? (
                        <Image
                            source={{ uri: coverImage }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
                            <Text style={{ fontFamily: 'serif', fontSize: 16, fontWeight: 'bold', color: '#fff' }}>{title}</Text>
                            <Text style={{ fontFamily: 'serif', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{author}</Text>
                        </View>
                    )}

                    {/* Glossy Overlay */}
                    <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0.1) 100%)',
                        opacity: 0.3
                    }} pointerEvents="none" />
                </View>

                <Text numberOfLines={2} style={{ fontFamily: 'serif', fontSize: 16, fontWeight: '600', color: '#333' }}>{title}</Text>
                <Text numberOfLines={1} style={{ fontFamily: 'serif', fontSize: 12, color: '#666' }}>{author}</Text>
            </Pressable>
        </Link>
    );
}

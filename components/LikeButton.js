import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heart } from 'lucide-react-native';
import { useTheme } from '../lib/theme';
import { API_URL } from '../lib/api';

export default function LikeButton({ storyId, size = 'medium', showCount = true, type = 'story' }) {
    const { theme } = useTheme();
    const [liked, setLiked] = useState(false);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const iconSize = size === 'small' ? 16 : 20;
    const fontSize = size === 'small' ? 12 : 14;

    const endpoint = type === 'book' ? 'books' : 'stories';

    useEffect(() => {
        loadLikeStatus();
    }, [storyId, type]);

    const loadLikeStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                // Authenticated: get personal like status
                const res = await fetch(`${API_URL}/api/${endpoint}/${storyId}/liked`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setLiked(data.liked);
                    setCount(data.count);
                }
            } else {
                // Not authenticated: just get count
                const res = await fetch(`${API_URL}/api/${endpoint}/${storyId}/likes`);
                if (res.ok) {
                    const data = await res.json();
                    setCount(data.count);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleLike = async () => {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            // Could show login prompt
            return;
        }

        setLoading(true);
        try {
            const method = liked ? 'DELETE' : 'POST';
            const res = await fetch(`${API_URL}/api/${endpoint}/${storyId}/like`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setLiked(data.liked);
                setCount(data.count);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: size === 'small' ? 4 : 8,
            }}
            onPress={handleToggleLike}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator size="small" color={theme.primary} />
            ) : (
                <Heart
                    size={iconSize}
                    color={liked ? '#E91E63' : theme.textTertiary}
                    fill={liked ? '#E91E63' : 'transparent'}
                />
            )}
            {showCount && (
                <Text style={{
                    color: liked ? '#E91E63' : theme.textTertiary,
                    fontSize,
                    marginLeft: 4,
                    fontWeight: liked ? '600' : 'normal',
                }}>
                    {count}
                </Text>
            )}
        </TouchableOpacity>
    );
}

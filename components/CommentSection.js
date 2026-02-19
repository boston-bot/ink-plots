import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Send, User, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../lib/theme';
import { API_URL } from '../lib/api';
import { joinStoryRoom, leaveStoryRoom, onNewComment, onNewReply } from '../lib/socket';

export default function CommentSection({ storyId, chapterId }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const currentUserIdRef = useRef(null);

    useEffect(() => {
        loadComments();

        // Join socket room for real-time updates
        joinStoryRoom(storyId);

        // Listen for new comments
        const unsubComment = onNewComment((comment) => {
            console.log('[Socket] Received new comment:', comment.id);
            // Only add if it's not our own comment (already added optimistically)
            if (comment.user_id !== currentUserIdRef.current) {
                setComments(prev => {
                    // Avoid duplicates
                    if (prev.some(c => c.id === comment.id)) return prev;
                    return [...prev, comment];
                });
            }
        });

        // Listen for new replies
        const unsubReply = onNewReply(({ parentId, reply }) => {
            console.log('[Socket] Received new reply for comment:', parentId);
            setComments(prev => prev.map(c => {
                if (c.id === parentId) {
                    const existingReplies = c.replies || [];
                    // Avoid duplicates
                    if (existingReplies.some(r => r.id === reply.id)) return c;
                    return { ...c, replies: [...existingReplies, reply] };
                }
                return c;
            }));
        });

        // Cleanup
        return () => {
            leaveStoryRoom(storyId);
            unsubComment();
            unsubReply();
        };
    }, [storyId]);

    const loadComments = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                // Not logged in - can't see comments
                setLoading(false);
                return;
            }

            // Decode token to get user ID for filtering
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUserIdRef.current = payload.id;
            } catch (e) {
                console.log('Could not decode token');
            }

            // Fetch only this user's private comments (with writer replies)
            const res = await fetch(`${API_URL}/api/stories/${storyId}/my-comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;

        setPosting(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Login Required', 'You must be logged in to leave feedback.');
                setPosting(false);
                return;
            }

            const res = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    story_id: storyId,
                    chapter_id: chapterId,
                    content: newComment
                })
            });

            if (res.ok) {
                const savedComment = await res.json();
                console.log('[DEBUG] Comment saved:', savedComment);
                // Add the new comment with empty replies array
                setComments(prev => [...prev, { ...savedComment, replies: [] }]);
                setNewComment('');
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('[DEBUG] Comment failed:', res.status, errorData);
                Alert.alert('Error', errorData.error || 'Failed to post feedback');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to post feedback');
        } finally {
            setPosting(false);
        }
    };

    if (loading) return <ActivityIndicator color={theme.primary} style={{ marginVertical: 40 }} />;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Your Feedback ({comments.length})</Text>
            <Text style={styles.subtitle}>
                Your comments are private - only you and the writer can see them.
            </Text>

            <View style={styles.list}>
                {comments.map((comment) => (
                    <View key={comment.id} style={styles.threadContainer}>
                        {/* User's Comment */}
                        <View style={styles.commentCard}>
                            <View style={styles.avatar}>
                                <User size={16} color="#fff" />
                            </View>
                            <View style={styles.commentContent}>
                                <Text style={styles.author}>
                                    {comment.user_id === currentUserIdRef.current ? 'You' : (comment.user?.email || comment.user_email || 'Reader')}
                                </Text>
                                <Text style={styles.text}>{comment.content}</Text>
                                <Text style={styles.date}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                            </View>
                        </View>

                        {/* Writer Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                            <View style={styles.repliesContainer}>
                                {comment.replies.map((reply) => (
                                    <View key={reply.id} style={styles.replyCard}>
                                        <View style={[styles.avatar, styles.writerAvatar]}>
                                            <MessageCircle size={14} color="#fff" />
                                        </View>
                                        <View style={styles.commentContent}>
                                            <Text style={[styles.author, styles.writerLabel]}>
                                                Writer
                                            </Text>
                                            <Text style={styles.text}>{reply.content}</Text>
                                            <Text style={styles.date}>{new Date(reply.created_at).toLocaleDateString()}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))}
            </View>

            {/* Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Leave feedback for the writer..."
                    placeholderTextColor={theme.textTertiary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !newComment.trim() && styles.disabledBtn]}
                    onPress={handlePostComment}
                    disabled={!newComment.trim() || posting}
                >
                    {posting ? <ActivityIndicator color="#fff" size="small" /> : <Send size={20} color="#fff" />}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        marginTop: 40,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    header: {
        fontFamily: 'serif',
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        color: theme.textTertiary,
        marginBottom: 20,
        fontStyle: 'italic',
    },
    list: {
        gap: 24,
        marginBottom: 20,
    },
    threadContainer: {
        gap: 12,
    },
    commentCard: {
        flexDirection: 'row',
        gap: 12,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    writerAvatar: {
        backgroundColor: '#9C27B0', // Purple for writer
    },
    commentContent: {
        flex: 1,
        backgroundColor: theme.surface,
        padding: 12,
        borderRadius: 12,
        borderTopLeftRadius: 4,
    },
    author: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.textSecondary,
        marginBottom: 4,
    },
    writerLabel: {
        color: '#9C27B0',
    },
    text: {
        fontSize: 14,
        color: theme.text,
        lineHeight: 20,
    },
    date: {
        fontSize: 10,
        color: theme.textTertiary,
        marginTop: 8,
        textAlign: 'right',
    },
    repliesContainer: {
        marginLeft: 44, // Indent replies
        gap: 12,
    },
    replyCard: {
        flexDirection: 'row',
        gap: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        backgroundColor: theme.surface,
        borderRadius: 24,
        padding: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.border,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        color: theme.text,
        paddingVertical: 10,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: {
        backgroundColor: theme.textTertiary,
        opacity: 0.5,
    },
});

import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, MessageSquare, Send, User, ChevronDown, ChevronUp } from 'lucide-react-native';
import CustomHeader from '../../components/CustomHeader';
import { useTheme } from '../../lib/theme';
import { API_URL } from '../../lib/api';

export default function InboxPage() {
    const { theme } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);
    const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'notifications'
    const [comments, setComments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedComment, setExpandedComment] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return router.replace('/auth/login');

            // Load comments on writer's stories
            const commentsRes = await fetch(`${API_URL}/api/writer/comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (commentsRes.ok) {
                const data = await commentsRes.json();
                setComments(data);
            }

            // Load notifications
            const notifRes = await fetch(`${API_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (notifRes.ok) {
                const data = await notifRes.json();
                setNotifications(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (commentId) => {
        if (!replyText.trim()) return;

        setReplying(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${API_URL}/api/comments/${commentId}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: replyText })
            });

            if (res.ok) {
                const reply = await res.json();
                // Add reply to the comment locally
                setComments(prev => prev.map(c => {
                    if (c.id === commentId) {
                        return { ...c, replies: [...(c.replies || []), reply] };
                    }
                    return c;
                }));
                setReplyText('');
                setExpandedComment(null);
                Alert.alert('Success', 'Reply sent!');
            } else {
                Alert.alert('Error', 'Failed to send reply');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to send reply');
        } finally {
            setReplying(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            await fetch(`${API_URL}/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <CustomHeader title="Inbox" />

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
                    onPress={() => setActiveTab('comments')}
                >
                    <MessageSquare size={18} color={activeTab === 'comments' ? theme.primary : theme.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
                        Feedback ({comments.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
                    onPress={() => setActiveTab('notifications')}
                >
                    <Bell size={18} color={activeTab === 'notifications' ? theme.primary : theme.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
                        Notifications {unreadCount > 0 && `(${unreadCount})`}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {activeTab === 'comments' ? (
                    <>
                        <Text style={styles.sectionHeader}>Reader Feedback on Your Stories</Text>

                        {comments.length === 0 ? (
                            <View style={styles.emptyState}>
                                <MessageSquare size={48} color={theme.textTertiary} />
                                <Text style={styles.emptyText}>No feedback yet</Text>
                                <Text style={styles.emptySubtext}>Publish a WIP to start receiving feedback!</Text>
                            </View>
                        ) : (
                            <View style={styles.list}>
                                {comments.map((comment) => (
                                    <View key={comment.id} style={styles.commentCard}>
                                        {/* Story Reference */}
                                        <Text style={styles.storyRef}>
                                            On "{comment.story_title}"
                                        </Text>

                                        {/* Commenter Info */}
                                        <View style={styles.commentHeader}>
                                            <View style={styles.avatar}>
                                                <User size={14} color="#fff" />
                                            </View>
                                            <Text style={styles.commenterName}>
                                                {comment.commenter?.email?.split('@')[0] || 'Reader'}
                                            </Text>
                                            <Text style={styles.commentDate}>
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>

                                        {/* Comment Content */}
                                        <Text style={styles.commentText}>{comment.content}</Text>

                                        {/* Existing Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <View style={styles.repliesSection}>
                                                <Text style={styles.repliesHeader}>Your Replies:</Text>
                                                {comment.replies.map((reply) => (
                                                    <View key={reply.id} style={styles.replyBubble}>
                                                        <Text style={styles.replyText}>{reply.content}</Text>
                                                        <Text style={styles.replyDate}>
                                                            {new Date(reply.created_at).toLocaleDateString()}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {/* Reply Toggle */}
                                        <TouchableOpacity
                                            style={styles.replyToggle}
                                            onPress={() => setExpandedComment(
                                                expandedComment === comment.id ? null : comment.id
                                            )}
                                        >
                                            <Text style={styles.replyToggleText}>
                                                {expandedComment === comment.id ? 'Cancel' : 'Reply'}
                                            </Text>
                                            {expandedComment === comment.id ? (
                                                <ChevronUp size={16} color={theme.primary} />
                                            ) : (
                                                <ChevronDown size={16} color={theme.primary} />
                                            )}
                                        </TouchableOpacity>

                                        {/* Reply Input */}
                                        {expandedComment === comment.id && (
                                            <View style={styles.replyInput}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Write your reply..."
                                                    placeholderTextColor={theme.textTertiary}
                                                    value={replyText}
                                                    onChangeText={setReplyText}
                                                    multiline
                                                />
                                                <TouchableOpacity
                                                    style={[styles.sendBtn, !replyText.trim() && styles.disabledBtn]}
                                                    onPress={() => handleReply(comment.id)}
                                                    disabled={!replyText.trim() || replying}
                                                >
                                                    {replying ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <Send size={18} color="#fff" />
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <>
                        <Text style={styles.sectionHeader}>System Notifications</Text>

                        {notifications.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Bell size={48} color={theme.textTertiary} />
                                <Text style={styles.emptyText}>No notifications yet</Text>
                            </View>
                        ) : (
                            <View style={styles.list}>
                                {notifications.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.notifItem, !item.is_read && styles.unreadItem]}
                                        onPress={() => markAsRead(item.id)}
                                    >
                                        <View style={styles.notifIcon}>
                                            {item.type === 'comment' || item.type === 'reply' ? (
                                                <MessageSquare size={18} color={theme.primary} />
                                            ) : (
                                                <Bell size={18} color={theme.textSecondary} />
                                            )}
                                        </View>
                                        <View style={styles.notifContent}>
                                            <Text style={styles.notifTitle}>
                                                {item.type === 'comment' ? 'New Comment' :
                                                    item.type === 'reply' ? 'Writer Replied' : 'Notification'}
                                            </Text>
                                            <Text style={styles.notifBody} numberOfLines={2}>
                                                {item.comment_content || 'You have a new notification.'}
                                            </Text>
                                            <Text style={styles.notifDate}>
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        {!item.is_read && <View style={styles.dot} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        paddingHorizontal: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: theme.primary,
    },
    tabText: {
        fontSize: 14,
        color: theme.textSecondary,
    },
    activeTabText: {
        color: theme.primary,
        fontWeight: '600',
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    sectionHeader: {
        fontSize: 14,
        color: theme.textSecondary,
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        color: theme.textSecondary,
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.textTertiary,
    },
    list: {
        gap: 16,
    },
    commentCard: {
        backgroundColor: theme.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
    },
    storyRef: {
        fontSize: 12,
        color: theme.primary,
        fontWeight: '600',
        marginBottom: 12,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.textTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    commenterName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: theme.text,
    },
    commentDate: {
        fontSize: 12,
        color: theme.textTertiary,
    },
    commentText: {
        fontSize: 14,
        color: theme.text,
        lineHeight: 20,
        marginBottom: 12,
    },
    repliesSection: {
        backgroundColor: theme.primary + '10',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    repliesHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.primary,
        marginBottom: 8,
    },
    replyBubble: {
        backgroundColor: theme.background,
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
    },
    replyText: {
        fontSize: 13,
        color: theme.text,
        lineHeight: 18,
    },
    replyDate: {
        fontSize: 10,
        color: theme.textTertiary,
        marginTop: 6,
        textAlign: 'right',
    },
    replyToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    replyToggleText: {
        fontSize: 14,
        color: theme.primary,
        fontWeight: '600',
    },
    replyInput: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginTop: 12,
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: theme.background,
        borderRadius: 12,
        padding: 12,
        color: theme.text,
        minHeight: 40,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: theme.border,
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
    notifItem: {
        flexDirection: 'row',
        padding: 14,
        backgroundColor: theme.surface,
        borderRadius: 12,
        alignItems: 'flex-start',
    },
    unreadItem: {
        backgroundColor: theme.primary + '10',
        borderWidth: 1,
        borderColor: theme.primary + '30',
    },
    notifIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    notifContent: {
        flex: 1,
    },
    notifTitle: {
        fontWeight: '600',
        fontSize: 14,
        color: theme.text,
        marginBottom: 4,
    },
    notifBody: {
        fontSize: 13,
        color: theme.textSecondary,
        marginBottom: 6,
    },
    notifDate: {
        fontSize: 11,
        color: theme.textTertiary,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.primary,
        marginLeft: 8,
        marginTop: 6,
    },
});

import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LayoutDashboard, BookOpen, PenTool, User, Edit3, LogOut } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../lib/theme';
import HeaderProfile from './HeaderProfile';
import BottomNav from './BottomNav';

const SidebarItem = ({ icon: Icon, label, active, onPress, theme, styles }) => (
    <Pressable style={[styles.navItem, active && styles.navItemActive]} onPress={onPress}>
        <Icon size={20} color={active ? theme.text : theme.textSecondary} />
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
);

const formatTier = (tier) => {
    if (!tier) return 'Free Account';
    const tierMap = {
        'free': 'Free Account',
        'premium': 'Premium Writer',
        'pro': 'Pro Writer',
        'admin': 'Administrator'
    };
    return tierMap[tier.toLowerCase()] || tier;
};

export default function WebSidebar({ children }) {
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const styles = getStyles(theme);
    const [user, setUser] = useState(null);
    const [isLargeScreen, setIsLargeScreen] = useState(Dimensions.get('window').width > 1024);

    useEffect(() => {
        const updateLayout = () => {
            setIsLargeScreen(Dimensions.get('window').width > 1024);
        };
        const sub = Dimensions.addEventListener('change', updateLayout);
        return () => sub?.remove();
    }, []);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem('userData');
                if (userData) {
                    setUser(JSON.parse(userData));
                }
            } catch (e) {
                console.error('Failed to load user data:', e);
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        const confirm = window.confirm("Are you sure you want to log out?");
        if (confirm) {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            router.replace('/auth/login');
        }
    };

    const navItems = [
        {
            icon: LayoutDashboard,
            label: 'Dashboard',
            route: '/dashboard',
            isActive: pathname === '/dashboard'
        },
        {
            icon: BookOpen,
            label: 'Library',
            route: '/library',
            isActive: pathname.startsWith('/library')
        },
        {
            icon: Edit3,
            label: 'WIP',
            route: '/wip',
            isActive: pathname.startsWith('/wip')
        },
        {
            icon: PenTool,
            label: 'Writer',
            route: '/writer',
            isActive: pathname.startsWith('/writer') && !pathname.includes('/inbox')
        },
        {
            icon: User,
            label: 'Inbox',
            route: '/writer/inbox',
            isActive: pathname === '/writer/inbox'
        },
    ];

    if (!isLargeScreen) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <View style={{ flex: 1 }}>
                    {children}
                </View>
                <BottomNav />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Left Sidebar */}
            <View style={styles.leftSidebar}>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar} />
                        <View style={styles.statusDot} />
                    </View>
                    <View>
                        <Text style={styles.userName}>
                            {user?.first_name || 'User'}{user?.last_name ? ` ${user.last_name}` : ''}
                        </Text>
                        <Text style={styles.userUsername}>@{user?.username || 'username'}</Text>
                        <Text style={styles.userRole}>{formatTier(user?.subscription_tier)}</Text>
                    </View>
                </View>

                <View style={styles.navMenu}>
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            active={item.isActive}
                            onPress={() => router.push(item.route)}
                            theme={theme}
                            styles={styles}
                        />
                    ))}
                </View>

                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color={theme.textSecondary} />
                    <Text style={styles.navLabel}>Log Out</Text>
                </Pressable>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                {children}
            </View>
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: theme.background,
    },
    leftSidebar: {
        width: 250,
        backgroundColor: theme.surface,
        borderRightWidth: 1,
        borderColor: theme.border,
        padding: 20,
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        height: '100vh',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 40,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderColor: theme.border,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: theme.surface,
    },
    userName: {
        fontFamily: 'serif',
        fontWeight: 'bold',
        fontSize: 14,
        color: theme.text,
    },
    userUsername: {
        fontFamily: 'serif',
        fontSize: 12,
        color: theme.primary,
        marginTop: 2,
    },
    userRole: {
        fontFamily: 'serif',
        fontSize: 11,
        color: theme.textSecondary,
        marginTop: 4,
    },
    navMenu: {
        gap: 8,
        flex: 1,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        borderRadius: 8,
    },
    navItemActive: {
        backgroundColor: theme.highlight || 'rgba(0,0,0,0.05)',
    },
    navLabel: {
        fontFamily: 'serif',
        fontSize: 14,
        color: theme.textSecondary,
    },
    navLabelActive: {
        color: theme.text,
        fontWeight: '600',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        marginTop: 20,
    },
});

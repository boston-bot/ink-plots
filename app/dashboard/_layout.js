import { View, Text, StyleSheet, ScrollView, Dimensions, Image, Pressable } from 'react-native';
import { Slot, Link, useRouter } from 'expo-router';
import { LayoutDashboard, BookOpen, History, PenTool, Star, Bookmark, XCircle, Settings, LogOut } from 'lucide-react-native';
import { useState, useEffect } from 'react';

const SidebarItem = ({ icon: Icon, label, active, onPress }) => (
    <Pressable style={[styles.navItem, active && styles.navItemActive]} onPress={onPress}>
        <Icon size={20} color={active ? '#000' : '#666'} />
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
);

export default function DashboardLayout() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [isLargeScreen, setIsLargeScreen] = useState(Dimensions.get('window').width > 1024);

    useEffect(() => {
        const updateLayout = () => {
            setIsLargeScreen(Dimensions.get('window').width > 1024);
        };
        const sub = Dimensions.addEventListener('change', updateLayout);
        return () => sub?.remove();
    }, []);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard' },
        { icon: BookOpen, label: 'Books' },
        { icon: History, label: 'Reading History' },
        { icon: PenTool, label: 'Author' },
        { icon: Star, label: 'Reviews' },
        { icon: Bookmark, label: 'Bookmarks' },
        { icon: XCircle, label: 'Dropped' },
        { icon: Settings, label: 'Settings' },
    ];

    const handleLogout = () => {
        // Clear token logic here
        router.replace('/auth/login');
    };

    if (!isLargeScreen) {
        // Mobile Layout (Simplified for now - can use Drawer later)
        return (
            <View style={styles.mobileContainer}>
                <View style={styles.mobileHeader}>
                    <Text style={styles.logo}>Ink Plots</Text>
                    <Pressable onPress={handleLogout}><LogOut size={24} color="#000" /></Pressable>
                </View>
                <Slot />
                <View style={styles.mobileNav}>
                    {menuItems.slice(0, 4).map((item) => (
                        <item.icon key={item.label} size={24} color="#666" />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Left Sidebar */}
            <View style={styles.leftSidebar}>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {/* Placeholder Avatar */}
                        <View style={styles.avatar} />
                        <View style={styles.statusDot} />
                    </View>
                    <View>
                        <Text style={styles.userName}>Joe Eagan</Text>
                        <Text style={styles.userRole}>Premium Writer</Text>
                    </View>
                </View>

                <View style={styles.navMenu}>
                    {menuItems.map((item) => (
                        <SidebarItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            active={activeTab === item.label}
                            onPress={() => setActiveTab(item.label)}
                        />
                    ))}
                </View>

                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="#666" />
                    <Text style={styles.navLabel}>Log Out</Text>
                </Pressable>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
                <Slot />
            </ScrollView>

            {/* Right Sidebar */}
            <View style={styles.rightSidebar}>
                <Text style={styles.sidebarTitle}>Weekly Feature</Text>
                <View style={styles.featureCard}>
                    <View style={styles.featureCover} />
                    <Text style={styles.featureTitle}>The Silent Earth</Text>
                    <Text style={styles.featureAuthor}>by Elena Fisher</Text>
                </View>

                <Text style={styles.sidebarTitle}>Featured Authors</Text>
                <View style={styles.authorList}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.authorItem}>
                            <View style={styles.authorAvatar} />
                            <Text style={styles.authorName}>Writer Name {i}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F9F7F1',
    },
    mobileContainer: {
        flex: 1,
        backgroundColor: '#F9F7F1',
    },
    mobileHeader: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    mobileNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        borderTopWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#fff',
    },
    leftSidebar: {
        width: 250,
        backgroundColor: '#fff',
        borderRightWidth: 1,
        borderColor: '#eee',
        padding: 20,
        justifyContent: 'space-between',
    },
    rightSidebar: {
        width: 300,
        backgroundColor: '#fff', // Or transparent/different shade
        borderLeftWidth: 1,
        borderColor: '#eee',
        padding: 20,
    },
    mainContent: {
        flex: 1,
        padding: 40,
    },
    logo: {
        fontFamily: 'serif',
        fontSize: 20,
        fontWeight: 'bold',
    },
    /* Profile Section */
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 40,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
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
        backgroundColor: '#4CAF50', // Microsoft Teams Green
        borderWidth: 2,
        borderColor: '#fff',
    },
    userName: {
        fontFamily: 'serif',
        fontWeight: 'bold',
        fontSize: 14,
    },
    userRole: {
        fontFamily: 'serif',
        fontSize: 12,
        color: '#666',
    },
    /* Navigation */
    navMenu: {
        gap: 8,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        borderRadius: 8,
    },
    navItemActive: {
        backgroundColor: '#F0F0F0',
    },
    navLabel: {
        fontFamily: 'serif',
        fontSize: 14,
        color: '#666',
    },
    navLabelActive: {
        color: '#000',
        fontWeight: '600',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        marginTop: 20,
    },
    /* Right Sidebar */
    sidebarTitle: {
        fontFamily: 'serif',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    featureCard: {
        marginBottom: 40,
        backgroundColor: '#fafafa',
        padding: 15,
        borderRadius: 8,
    },
    featureCover: {
        width: '100%',
        height: 150,
        backgroundColor: '#ddd',
        borderRadius: 4,
        marginBottom: 10,
    },
    featureTitle: {
        fontFamily: 'serif',
        fontWeight: 'bold',
        fontSize: 16,
    },
    featureAuthor: {
        fontFamily: 'serif',
        fontSize: 14,
        color: '#666',
    },
    authorList: {
        gap: 15,
    },
    authorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    authorAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#eee',
    },
    authorName: {
        fontFamily: 'serif',
        fontSize: 14,
    },
});

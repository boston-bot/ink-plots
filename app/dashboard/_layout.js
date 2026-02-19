import { View, Text, StyleSheet, ScrollView, Dimensions, Image, Pressable, TouchableOpacity } from 'react-native';
import WebSidebar from '../../components/WebSidebar';
import { Slot, Link, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import CustomHeader from '../../components/CustomHeader';
import { useTheme } from '../../lib/theme';
import BottomNav from '../../components/BottomNav';



// Format subscription tier for display


export default function DashboardLayout() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const router = useRouter();
    const [isLargeScreen, setIsLargeScreen] = useState(Dimensions.get('window').width > 1024);

    useEffect(() => {
        const updateLayout = () => {
            setIsLargeScreen(Dimensions.get('window').width > 1024);
        };
        const sub = Dimensions.addEventListener('change', updateLayout);
        return () => sub?.remove();
    }, []);

    if (!isLargeScreen) {
        // Mobile Layout (Simplified for now - can use Drawer later)
        return (
            <View style={styles.mobileContainer}>
                <CustomHeader />
                <View style={{ flex: 1 }}>
                    <Slot />
                </View>
                <BottomNav />
            </View>
        );
    }

    return (
        <WebSidebar>
            <View style={styles.webContentContainer}>
                {/* Main Content with Header */}
                <View style={{ flex: 1 }}>
                    <CustomHeader />

                    <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
                        <Slot />
                    </ScrollView>
                </View>

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
        </WebSidebar>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    webContentContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    mobileContainer: {
        flex: 1,
        backgroundColor: theme.background,
    },
    rightSidebar: {
        width: 300,
        backgroundColor: theme.surface, // Or transparent/different shade
        borderLeftWidth: 1,
        borderColor: theme.border,
        padding: 20,
    },
    mainContent: {
        flex: 1,
        padding: 40,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 16,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderColor: theme.border,
    },
    headerLogo: {
        fontFamily: 'serif',
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.text,
    },
    logo: {
        fontFamily: 'serif',
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.text,
    },

    /* Right Sidebar */
    sidebarTitle: {
        fontFamily: 'serif',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: theme.text,
    },
    featureCard: {
        marginBottom: 40,
        backgroundColor: theme.card, // Need card color in theme or similar
        padding: 15,
        borderRadius: 8,
    },
    featureCover: {
        width: '100%',
        height: 150,
        backgroundColor: theme.border,
        borderRadius: 4,
        marginBottom: 10,
    },
    featureTitle: {
        fontFamily: 'serif',
        fontWeight: 'bold',
        fontSize: 16,
        color: theme.text,
    },
    featureAuthor: {
        fontFamily: 'serif',
        fontSize: 14,
        color: theme.textSecondary,
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
        backgroundColor: theme.border,
    },
    authorName: {
        fontFamily: 'serif',
        fontSize: 14,
        color: theme.text,
    },
});

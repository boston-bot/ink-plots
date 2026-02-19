import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LayoutDashboard, BookOpen, PenTool, User, Edit3 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';

export default function BottomNav() {
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const styles = getStyles(theme, insets);

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

    return (
        <View style={styles.container}>
            <View style={styles.navBar}>
                {navItems.map((item) => (
                    <Pressable
                        key={item.label}
                        style={styles.navItem}
                        onPress={() => router.push(item.route)}
                    >
                        <item.icon
                            size={22}
                            color={item.isActive ? theme.text : theme.textSecondary}
                            strokeWidth={item.isActive ? 2.5 : 2}
                        />
                        <Text style={[
                            styles.navLabel,
                            item.isActive && styles.navLabelActive,
                            { color: item.isActive ? theme.text : theme.textSecondary }
                        ]}>
                            {item.label}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const getStyles = (theme, insets) => StyleSheet.create({
    container: {
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingBottom: Math.max(insets.bottom, 10), // Respect safe area
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        paddingVertical: 5,
        minWidth: 0,
        flex: 1,
    },
    navLabel: {
        fontFamily: 'serif',
        fontSize: 9,
        marginTop: 3,
        fontWeight: '500',
    },
    navLabelActive: {
        fontWeight: '700',
    }
});

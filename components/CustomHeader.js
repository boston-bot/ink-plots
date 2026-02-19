import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import HeaderProfile from './HeaderProfile';
import { useTheme } from '../lib/theme';

export default function CustomHeader({ title, rightComponent, backgroundColor, textColor: customTextColor }) {
    const router = useRouter();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    // Immediate colors for instant render (prevent flash)
    const isDark = Platform.OS !== 'web';
    const defaultTextColor = isDark ? '#FFFFFF' : '#000000';
    const defaultBgColor = isDark ? '#121212' : '#F9F7F1';

    const finalTextColor = customTextColor || theme.text || defaultTextColor;
    const finalBgColor = backgroundColor || theme.background || defaultBgColor;

    return (
        <View style={[styles.header, {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 10), // Adjust for Android/iOS status bar differences if needed
            height: 60 + insets.top,
            backgroundColor: finalBgColor
        }]}>
            <View style={styles.headerLeft}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/dashboard');
                        }
                    }}
                    style={styles.backButton}
                >
                    <ChevronLeft color={finalTextColor} size={28} />
                </TouchableOpacity>
            </View>

            <View
                style={[styles.headerTitleContainer, { top: insets.top + (Platform.OS === 'ios' ? 0 : 10) }]}
                pointerEvents="box-none"
            >
                <TouchableOpacity onPress={() => router.replace('/')}>
                    <Text style={{
                        fontFamily: 'serif',
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: finalTextColor
                    }}>
                        {title || 'The Ink Plots'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.headerRight}>
                {rightComponent || <HeaderProfile />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 10,
        zIndex: 100, // Ensure header stays on top
    },
    headerLeft: {
        flex: 1,
        alignItems: 'flex-start',
        zIndex: 10,
    },
    headerTitleContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 10, // match header paddingBottom
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    headerRight: {
        flex: 1,
        alignItems: 'flex-end',
        zIndex: 10,
    },
    backButton: {
        padding: 4,
        marginLeft: -8,
    },
});

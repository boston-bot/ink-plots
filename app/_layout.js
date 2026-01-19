import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { ThemeProvider } from '../lib/theme';

export default function Layout() {
    // Dark mode colors
    const isDarkMode = Platform.OS !== 'web'; // Dark mode for mobile, light for web
    const backgroundColor = isDarkMode ? '#121212' : '#F9F7F1';
    const textColor = isDarkMode ? '#FFFFFF' : '#000';

    return (
        <ThemeProvider>
            <Stack screenOptions={{
                headerStyle: { backgroundColor },
                headerTintColor: textColor,
                headerTitleStyle: { fontFamily: 'serif', fontWeight: 'bold' },
                contentStyle: { backgroundColor },
            }} />
        </ThemeProvider>
    );
}

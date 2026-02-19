import { Stack } from 'expo-router';
import { Platform, View, StatusBar } from 'react-native';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { ThemeProvider } from '../lib/theme';
import { InkDarkTheme, InkLightTheme } from '../lib/navigation-theme';

export default function Layout() {
    // Dark mode colors - calculated immediately, before any rendering
    const isDarkMode = Platform.OS !== 'web'; // Dark mode for mobile, light for web
    const backgroundColor = isDarkMode ? '#121212' : '#F9F7F1';
    const textColor = isDarkMode ? '#FFFFFF' : '#000000';

    return (
        <View style={{ flex: 1, backgroundColor }}>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor={backgroundColor}
            />
            <NavigationThemeProvider value={isDarkMode ? InkDarkTheme : InkLightTheme}>
                <ThemeProvider>
                    <Stack screenOptions={{
                        headerStyle: {
                            backgroundColor,
                        },
                        headerTintColor: textColor,
                        headerTitleStyle: {
                            fontFamily: 'serif',
                            fontWeight: 'bold',
                            color: textColor,
                        },
                        contentStyle: { backgroundColor },
                        headerBackTitleVisible: false,
                        animation: 'fade',
                        animationDuration: 200,
                        headerShown: false,
                    }} />
                </ThemeProvider>
            </NavigationThemeProvider>
        </View>
    );
}

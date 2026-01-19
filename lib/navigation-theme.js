import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const InkDarkTheme = {
    ...DarkTheme,
    dark: true,
    colors: {
        ...DarkTheme.colors,
        primary: '#FF6B35',
        background: '#121212',
        card: '#121212', // Critical: This sets header background
        text: '#FFFFFF',
        border: '#333333',
        notification: '#FF6B35',
    },
};

export const InkLightTheme = {
    ...DefaultTheme,
    dark: false,
    colors: {
        ...DefaultTheme.colors,
        primary: '#FF6B35',
        background: '#F9F7F1',
        card: '#F9F7F1',
        text: '#000000',
        border: '#E0E0E0',
        notification: '#FF6B35',
    },
};

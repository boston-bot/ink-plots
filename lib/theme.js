import { createContext, useContext } from 'react';
import { Platform, useColorScheme } from 'react-native';

// Define color palettes
const lightTheme = {
    background: '#F9F7F1',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    primary: '#FF6B35',
    primaryDark: '#E55A2B',
    accent: '#4CAF50',
    border: '#E0E0E0',
    shadow: '#000000',
    error: '#E63946',
    cardBg: '#FFFFFF',
    overlayBg: 'rgba(0, 0, 0, 0.5)',
};

const darkTheme = {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    text: '#FFFFFF',
    textSecondary: '#B3B3B3',
    textTertiary: '#808080',
    primary: '#FF6B35',
    primaryDark: '#E55A2B',
    accent: '#4CAF50',
    border: '#383838',
    shadow: '#000000',
    error: '#FF5252',
    cardBg: '#1E1E1E',
    overlayBg: 'rgba(0, 0, 0, 0.7)',
};

const ThemeContext = createContext({
    theme: lightTheme,
    isDark: false
});

export const ThemeProvider = ({ children }) => {
    // Use dark mode for mobile, light for web
    const isDark = Platform.OS !== 'web';
    const theme = isDark ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

// Helper to get theme synchronously (for use outside React components)
export const getTheme = () => {
    const isDark = Platform.OS !== 'web';
    return isDark ? darkTheme : lightTheme;
};

export { lightTheme, darkTheme };

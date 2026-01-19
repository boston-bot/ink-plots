// Helper to create theme-aware dynamic styles
// Usage: const styles = createThemedStyles(theme => ({ ... }), theme);

export const createThemedStyles = (stylesFn, theme) => {
    return stylesFn(theme);
};

// Common themed styles that can be reused
export const commonThemedStyles = (theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    card: {
        backgroundColor: theme.cardBg,
        borderColor: theme.border,
        shadowColor: theme.shadow,
    },
    text: {
        color: theme.text,
    },
    textSecondary: {
        color: theme.textSecondary,
    },
    textTertiary: {
        color: theme.textTertiary,
    },
    surface: {
        backgroundColor: theme.surface,
    },
    button: {
        backgroundColor: theme.primary,
    },
    input: {
        backgroundColor: theme.surface,
        borderColor: theme.border,
        color: theme.text,
    },
});

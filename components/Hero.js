import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function Hero() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>Ink Plots</Text>
                <View style={styles.authContainer}>
                    <Pressable style={styles.loginBtn}>
                        <Text style={styles.loginText}>Log In</Text>
                    </Pressable>
                    <Pressable style={styles.joinBtn}>
                        <Text style={styles.joinText}>Sign Up</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.headline}>
                    Stories found in the static.
                </Text>
                <Text style={styles.subheadline}>
                    A curated space for the boldest independent voices.
                    Read, write, and discover the unseen.
                </Text>

                <Link href="/submit" asChild>
                    <Pressable style={styles.ctaBtn}>
                        <Text style={styles.ctaText}>Start Writing</Text>
                    </Pressable>
                </Link>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 60,
        marginTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 60,
    },
    logo: {
        fontFamily: 'serif',
        fontSize: 24,
        fontWeight: 'bold',
    },
    authContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    loginBtn: {
        padding: 8,
    },
    loginText: {
        fontFamily: 'serif',
        fontSize: 16,
    },
    joinBtn: {
        backgroundColor: '#000',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
    },
    joinText: {
        color: '#fff',
        fontFamily: 'serif',
        fontSize: 14,
        fontWeight: '500',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headline: {
        fontFamily: 'serif',
        fontSize: 48,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 56,
    },
    subheadline: {
        fontFamily: 'serif',
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        maxWidth: 600,
        lineHeight: 28,
        marginBottom: 40,
    },
    ctaBtn: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 2,
    },
    ctaText: {
        fontFamily: 'serif',
        fontSize: 16,
        letterSpacing: 1,
    },
});

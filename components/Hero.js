import { View, Text, Pressable, StyleSheet, Image, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { useState, useEffect } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const QUOTES = [
    "“The ink dries, but the story breathes forever.”",
    "“Shadows speak when the lights go out.”",
    "“There is no silence quite like a finished page.”",
    "“Words are the ghosts of thoughts.”"
];

export default function Hero() {
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [isLargeScreen, setIsLargeScreen] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        }, 5000); // Rotate every 5 seconds

        // Simple check for initial dimension
        if (Dimensions.get('window').width > 768) {
            setIsLargeScreen(true);
        }

        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.leftSection}>
                    <View style={styles.branding}>
                        <Text style={styles.logo}>Ink Plots</Text>
                    </View>
                    <View style={styles.navLinks}>
                        <Pressable><Text style={styles.navLink}>Books</Text></Pressable>
                        <Pressable><Text style={styles.navLink}>Read Stories</Text></Pressable>
                        <Pressable><Text style={styles.navLink}>About</Text></Pressable>
                        <Pressable><Text style={styles.navLink}>Contact</Text></Pressable>
                    </View>
                </View>

                <View style={styles.authContainer}>
                    <Link href="/auth/login" asChild>
                        <Pressable style={styles.loginBtn}>
                            <Text style={styles.loginText}>Log In</Text>
                        </Pressable>
                    </Link>
                    <Pressable style={styles.joinBtn}>
                        <Text style={styles.joinText}>Sign Up</Text>
                    </Pressable>
                </View>
            </View>

            <View style={[styles.content, isLargeScreen && styles.contentRow]}>
                <View style={[styles.textContent, isLargeScreen && styles.textContentLarge]}>
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

                <View style={[styles.visualContent, isLargeScreen && styles.visualContentLarge]}>
                    <Image
                        source={require('../assets/hero-ink.png')}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    <View style={styles.quoteContainer}>
                        <Animated.Text
                            key={quoteIndex}
                            entering={FadeIn.duration(1000)}
                            exiting={FadeOut.duration(1000)}
                            style={styles.quoteText}
                        >
                            {QUOTES[quoteIndex]}
                        </Animated.Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 60,
        marginTop: 20,
        paddingHorizontal: 20,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
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
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 40,
    },
    navLinks: {
        flexDirection: 'row',
        gap: 20,
        // display: 'none', // Removed for now to ensure visibility on web
        display: 'flex',
    },
    navLink: {
        fontFamily: 'serif',
        fontSize: 16,
        color: '#444',
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
        flexDirection: 'column',
        alignItems: 'center',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    textContent: {
        alignItems: 'center',
        marginBottom: 40,
    },
    textContentLarge: {
        alignItems: 'flex-start',
        width: '45%',
        paddingTop: 40,
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
    visualContent: {
        width: '100%',
        alignItems: 'center',
        position: 'relative',
    },
    visualContentLarge: {
        width: '45%',
    },
    heroImage: {
        width: 300,
        height: 300,
        borderRadius: 4,
        opacity: 0.9,
    },
    quoteContainer: {
        position: 'absolute',
        bottom: -20,
        right: '10%', // Offset from right
        backgroundColor: '#fff',
        padding: 20,
        maxWidth: 250,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#eee',
    },
    quoteText: {
        fontFamily: 'serif',
        fontSize: 16,
        fontStyle: 'italic',
        color: '#333',
        lineHeight: 24,
    },
});

import { View, Text, Pressable, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUOTES = [
    "“The ink dries, but the story breathes forever.”",
    "“Shadows speak when the lights go out.”",
    "“There is no silence quite like a finished page.”",
    "“Words are the ghosts of thoughts.”"
];

export default function Hero() {
    const router = useRouter();
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [isLargeScreen, setIsLargeScreen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    useFocusEffect(
        useCallback(() => {
            checkLogin();
        }, [])
    );

    useEffect(() => {
        checkLogin();
    }, []);

    const checkLogin = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            console.log("Hero Check Login - Token:", token ? "Exists" : "Null");
            setIsLoggedIn(!!token);
        } catch (e) {
            console.error("Hero Check Login Error:", e);
        }
    };

    const handleSignOut = async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setIsLoggedIn(false);
        setShowMenu(false);
        router.replace('/');
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        }, 5000);

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
                        <Link href="/" asChild><Pressable><Text style={styles.navLink}>Books</Text></Pressable></Link>
                        <Pressable><Text style={styles.navLink}>Read Stories</Text></Pressable>
                        <Pressable><Text style={styles.navLink}>About</Text></Pressable>
                        <Pressable><Text style={styles.navLink}>Contact</Text></Pressable>
                    </View>
                </View>

                <View style={styles.authContainer}>
                    {isLoggedIn ? (
                        <View style={{ position: 'relative', zIndex: 100 }}>
                            <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.profileBtn}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>IP</Text>
                                </View>
                            </TouchableOpacity>

                            {showMenu && (
                                <View style={styles.dropdownMenu}>
                                    <TouchableOpacity onPress={() => { setShowMenu(false); router.push('/dashboard'); }} style={styles.menuItem}>
                                        <Text style={styles.menuText}>Account</Text>
                                    </TouchableOpacity>
                                    <View style={styles.menuDivider} />
                                    <TouchableOpacity onPress={handleSignOut} style={styles.menuItem}>
                                        <Text style={[styles.menuText, { color: 'red' }]}>Sign Out</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                        <>
                            <Link href="/auth/login" asChild>
                                <Pressable style={styles.loginBtn}>
                                    <Text style={styles.loginText}>Log In</Text>
                                </Pressable>
                            </Link>
                            <Pressable style={styles.joinBtn}>
                                <Text style={styles.joinText}>Sign Up</Text>
                            </Pressable>
                        </>
                    )}
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
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 20,
        zIndex: 100, // Ensure header is on top for dropdown
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
    profileBtn: {
        padding: 5,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    dropdownMenu: {
        position: 'absolute',
        top: 50,
        right: 0,
        width: 150,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#eee',
    },
    menuItem: {
        padding: 12,
    },
    menuText: {
        fontSize: 14,
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#eee',
        marginHorizontal: 5,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 40,
    },
    navLinks: {
        flexDirection: 'row',
        gap: 20,
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

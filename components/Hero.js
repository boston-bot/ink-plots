import { View, Text, Pressable, StyleSheet, Image, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../lib/theme';

const QUOTES = [
    "“The ink dries, but the story breathes forever.”",
    "“Shadows speak when the lights go out.”",
    "“There is no silence quite like a finished page.”",
    "“Words are the ghosts of thoughts.”"
];

export default function Hero() {
    const router = useRouter();
    const { theme } = useTheme();
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [isLargeScreen, setIsLargeScreen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const insets = useSafeAreaInsets();
    const styles = getStyles(theme);

    useFocusEffect(
        useCallback(() => {
            checkLogin();
        }, [])
    );

    // ... (logic remains same)

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.leftSection}>
                    <View style={styles.branding}>
                        <Text style={styles.logo}>The Ink Plots</Text>
                    </View>
                    {isLargeScreen && (
                        <View style={styles.navLinks}>
                            <Link href="/library" asChild><Pressable><Text style={styles.navLink}>Library</Text></Pressable></Link>
                            <Link href="/stories" asChild><Pressable><Text style={styles.navLink}>Stories</Text></Pressable></Link>
                            <Pressable onPress={() => {
                                if (isLoggedIn) {
                                    router.push('/writer');
                                } else {
                                    router.push('/auth/login?redirect=/writer');
                                }
                            }}>
                                <Text style={styles.navLink}>Start Writing</Text>
                            </Pressable>
                            <Pressable><Text style={styles.navLink}>About</Text></Pressable>
                            <Pressable><Text style={styles.navLink}>Contact</Text></Pressable>
                        </View>
                    )}
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

            {/* Mobile Navigation - Only show on small screens */}
            {!isLargeScreen && (
                <View style={styles.mobileNav}>
                    <Link href="/library" asChild>
                        <Pressable style={styles.mobileNavLink}>
                            <Text style={styles.mobileNavText}>Library</Text>
                        </Pressable>
                    </Link>
                    <Link href="/stories" asChild>
                        <Pressable style={styles.mobileNavLink}>
                            <Text style={styles.mobileNavText}>Stories</Text>
                        </Pressable>
                    </Link>
                    <Pressable
                        style={styles.mobileNavLink}
                        onPress={() => {
                            if (isLoggedIn) {
                                router.push('/writer');
                            } else {
                                router.push('/auth/login?redirect=/writer');
                            }
                        }}
                    >
                        <Text style={styles.mobileNavText}>Start Writing</Text>
                    </Pressable>
                </View>
            )}

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
                        <AnimatedQuoteText quote={QUOTES[quoteIndex]} />
                    </View>
                </View>
            </View>
        </View>
    );
}

function AnimatedQuoteText({ quote }) {
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                // useNativeDriver: true, // Text opacity often requires false on some RN versions if not layout-only, but true is preferred for opacity
                useNativeDriver: true,
            }),
            Animated.delay(3000),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            })
        ]).start();
    }, [quote]);

    return (
        <Animated.Text
            style={[styles.quoteText, { opacity: fadeAnim }]}
        >
            {quote}
        </Animated.Text>
    );
}

const getStyles = (theme) => StyleSheet.create({
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
        borderBottomColor: theme.border,
        paddingBottom: 20,
        zIndex: 100, // Ensure header is on top for dropdown
    },
    logo: {
        fontFamily: 'serif',
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.text,
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
        backgroundColor: theme.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: theme.text,
        fontWeight: 'bold',
    },
    dropdownMenu: {
        position: 'absolute',
        top: 50,
        right: 0,
        width: 150,
        backgroundColor: theme.surface,
        borderRadius: 8,
        padding: 5,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: theme.border,
    },
    menuItem: {
        padding: 12,
    },
    menuText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.text,
    },
    menuDivider: {
        height: 1,
        backgroundColor: theme.border,
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
        color: theme.textSecondary,
    },
    loginBtn: {
        padding: 8,
    },
    loginText: {
        fontFamily: 'serif',
        fontSize: 16,
        color: theme.text,
    },
    joinBtn: {
        backgroundColor: theme.primary,
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
        color: theme.text,
    },
    subheadline: {
        fontFamily: 'serif',
        fontSize: 18,
        color: theme.textSecondary,
        textAlign: 'center',
        maxWidth: 600,
        lineHeight: 28,
        marginBottom: 40,
    },
    ctaBtn: {
        borderBottomWidth: 1,
        borderBottomColor: theme.text,
        paddingBottom: 2,
    },
    ctaText: {
        fontFamily: 'serif',
        fontSize: 16,
        letterSpacing: 1,
        color: theme.text,
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
        backgroundColor: theme.surface,
        padding: 20,
        maxWidth: 250,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: theme.border,
    },
    quoteText: {
        fontFamily: 'serif',
        fontSize: 16,
        fontStyle: 'italic',
        color: theme.text,
        lineHeight: 24,
    },
    mobileNav: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        marginBottom: 20,
    },
    mobileNavLink: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    mobileNavText: {
        fontFamily: 'serif',
        fontSize: 16,
        fontWeight: '600',
        color: theme.textSecondary,
    },
});

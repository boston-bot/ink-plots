import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../lib/theme';

export default function HeaderProfile() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 10 });
    const buttonRef = useRef(null);
    const { width: windowWidth } = useWindowDimensions();

    // Get colors immediately from Platform, don't wait for theme context
    const isDark = Platform.OS !== 'web';
    const immediateTheme = {
        text: isDark ? '#FFFFFF' : '#000000',
        background: isDark ? '#121212' : '#F9F7F1',
        surface: isDark ? '#1E1E1E' : '#FFFFFF',
        border: isDark ? '#383838' : '#E0E0E0',
    };

    const { theme } = useTheme();
    const styles = getStyles(theme || immediateTheme);

    useFocusEffect(
        useCallback(() => {
            checkLogin();
        }, [])
    );

    const checkLogin = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            setIsLoggedIn(!!token);
        } catch (e) {
            console.error("Header Profile Check Error", e);
        }
    };

    const handleSignOut = async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setIsLoggedIn(false);
        setShowMenu(false);
        router.replace('/');
    };

    const handleOpenMenu = () => {
        buttonRef.current?.measureInWindow((x, y, width, height) => {
            setMenuPosition({
                top: y + height + 5,
                right: windowWidth - (x + width)
            });
            setShowMenu(true);
        });
    };

    if (!isLoggedIn) {
        return (
            <View style={styles.authButtons}>
                <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.loginBtn}>
                    <Text style={styles.loginText}>Log In</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.signUpBtn}>
                    <Text style={styles.signUpText}>Sign Up</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                ref={buttonRef}
                onPress={handleOpenMenu}
                style={styles.profileBtn}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>IP</Text>
                </View>
            </TouchableOpacity>

            <Modal
                transparent={true}
                visible={showMenu}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.dropdownMenu, { top: menuPosition.top, right: menuPosition.right }]}>
                            <TouchableOpacity onPress={() => { setShowMenu(false); router.push('/dashboard'); }} style={styles.menuItem}>
                                <Text style={styles.menuText}>Account</Text>
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />
                            <TouchableOpacity onPress={handleSignOut} style={styles.menuItem}>
                                <Text style={[styles.menuText, { color: 'red' }]}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

function getStyles(theme) {
    return StyleSheet.create({
        container: {
            marginRight: 12,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1000,
        },
        profileBtn: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatar: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#333',
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 12,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'transparent',
        },
        dropdownMenu: {
            position: 'absolute',
            width: 140,
            backgroundColor: theme.surface,
            borderRadius: 8,
            padding: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 10,
            zIndex: 9999,
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
        authButtons: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        loginBtn: {
            paddingHorizontal: 14,
            paddingVertical: 8,
        },
        loginText: {
            fontSize: 15,
            color: theme.text,
            fontWeight: '500',
            fontFamily: 'serif',
        },
        signUpBtn: {
            backgroundColor: '#000',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
        },
        signUpText: {
            fontSize: 15,
            color: '#fff',
            fontWeight: '600',
            fontFamily: 'serif',
        },
    });
}

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function HeaderProfile() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

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
    );
}

const styles = StyleSheet.create({
    profileBtn: {
        padding: 4,
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
    dropdownMenu: {
        position: 'absolute',
        top: 45,
        right: 0,
        width: 140,
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
        color: '#333',
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

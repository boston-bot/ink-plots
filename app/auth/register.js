import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import AnimatedEntry from '../../components/AnimatedEntry';
import { API_URL } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../lib/theme';
import { Check, X } from 'lucide-react-native';

export default function RegisterScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const styles = getStyles(theme);

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Username availability
    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    // Debounced username check
    useEffect(() => {
        if (username.length < 3) {
            setUsernameAvailable(null);
            return;
        }

        // Validate format first
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
            setUsernameAvailable(false);
            return;
        }

        const timer = setTimeout(async () => {
            setCheckingUsername(true);
            try {
                const res = await fetch(`${API_URL}/api/check-username/${encodeURIComponent(username)}`);
                const data = await res.json();
                setUsernameAvailable(data.available);
            } catch (e) {
                console.error(e);
            } finally {
                setCheckingUsername(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    const handleRegister = async () => {
        // Validation
        if (!email || !username || !firstName || !password) {
            setError('Please fill in all required fields');
            return;
        }

        if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
            setError('Username must be 3-30 characters with only letters, numbers, and underscores');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (usernameAvailable === false) {
            setError('Username is not available');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    username,
                    first_name: firstName,
                    last_name: lastName || undefined,
                    date_of_birth: dateOfBirth || undefined
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Auto-login after registration
            await AsyncStorage.setItem('userToken', data.token);
            if (data.user) {
                await AsyncStorage.setItem('userData', JSON.stringify(data.user));
            }

            router.replace('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderUsernameStatus = () => {
        if (checkingUsername) {
            return <ActivityIndicator size="small" color={theme.textSecondary} />;
        }
        if (usernameAvailable === true) {
            return <Check size={18} color="#4CAF50" />;
        }
        if (usernameAvailable === false) {
            return <X size={18} color="#f44336" />;
        }
        return null;
    };

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                <AnimatedEntry>
                    <Text style={styles.logo}>The Ink Plots</Text>
                    <Text style={styles.subtitle}>Create your account</Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <View style={styles.form}>
                        <Text style={styles.label}>Email Address *</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            placeholder="writer@example.com"
                            keyboardType="email-address"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={styles.label}>Username *</Text>
                        <View style={styles.usernameContainer}>
                            <TextInput
                                style={[styles.input, styles.usernameInput]}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                placeholder="your_unique_handle"
                                placeholderTextColor={theme.textSecondary}
                            />
                            <View style={styles.usernameStatus}>
                                {renderUsernameStatus()}
                            </View>
                        </View>
                        <Text style={styles.hint}>3-30 characters, letters, numbers, underscores only</Text>

                        <Text style={styles.label}>First Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Your first name"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={styles.label}>Last Name (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Your last name"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={styles.label}>Date of Birth (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={dateOfBirth}
                            onChangeText={setDateOfBirth}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={styles.label}>Password *</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholder="At least 8 characters"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Text style={styles.label}>Confirm Password *</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            placeholder="Re-enter password"
                            placeholderTextColor={theme.textSecondary}
                        />

                        <Pressable
                            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>CREATE ACCOUNT</Text>
                            )}
                        </Pressable>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account?</Text>
                            <Pressable onPress={() => router.push('/auth/login')}>
                                <Text style={styles.link}> Sign in</Text>
                            </Pressable>
                        </View>
                    </View>
                </AnimatedEntry>
            </View>
        </ScrollView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: theme.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
    },
    logo: {
        fontFamily: 'serif',
        fontSize: 32,
        textAlign: 'center',
        marginBottom: 10,
        color: theme.text,
    },
    subtitle: {
        fontFamily: 'serif',
        fontSize: 16,
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
    },
    form: {
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    label: {
        fontFamily: 'serif',
        fontSize: 14,
        marginBottom: 8,
        color: theme.text,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        paddingVertical: 10,
        paddingHorizontal: 5,
        marginBottom: 20,
        fontFamily: 'serif',
        fontSize: 16,
        color: theme.text,
    },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    usernameInput: {
        flex: 1,
        marginBottom: 5,
    },
    usernameStatus: {
        width: 30,
        alignItems: 'center',
        marginLeft: 10,
    },
    hint: {
        fontFamily: 'serif',
        fontSize: 12,
        color: theme.textSecondary,
        marginBottom: 20,
    },
    btn: {
        backgroundColor: theme.primary,
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    btnText: {
        color: '#fff',
        fontFamily: 'serif',
        fontSize: 14,
        letterSpacing: 1,
        fontWeight: 'bold',
    },
    error: {
        color: '#f44336',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'serif',
    },
    footer: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'center'
    },
    footerText: {
        fontFamily: 'serif',
        color: theme.textSecondary
    },
    link: {
        fontFamily: 'serif',
        fontWeight: 'bold',
        color: theme.text
    }
});

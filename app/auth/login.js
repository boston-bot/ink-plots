import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import AnimatedEntry from '../../components/AnimatedEntry';
import { API_URL } from '../lib/api'; // Corrected path

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            // Direct fetch to API login endpoint
            // Adjust URL if api.js export isn't directly usable here yet
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Success! In a real app, store data.token in SecureStore
            console.log('Logged in!', data.token);
            router.replace('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <AnimatedEntry>
                <Text style={styles.logo}>Ink Plots</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.form}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        placeholder="writer@example.com"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Pressable
                        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>ENTER</Text>
                        )}
                    </Pressable>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>New here?</Text>
                        <Pressable><Text style={styles.link}> Create an account</Text></Pressable>
                    </View>
                </View>
            </AnimatedEntry>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F7F1', // White paper background (Warmer)
        justifyContent: 'center',
        padding: 30,
    },
    logo: {
        fontFamily: 'serif',
        fontSize: 32,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: 'serif',
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 50,
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
        color: '#333',
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingVertical: 10,
        paddingHorizontal: 5,
        marginBottom: 30,
        fontFamily: 'serif',
        fontSize: 16,
    },
    btn: {
        backgroundColor: '#000',
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
        color: 'red',
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
        color: '#666'
    },
    link: {
        fontFamily: 'serif',
        fontWeight: 'bold'
    }
});

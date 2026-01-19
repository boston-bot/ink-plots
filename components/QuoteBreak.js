import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useState } from 'react';

const QUOTES = [
    { text: "The shortest distance between a human being and truth is a story.", author: "Anthony de Mello" },
    { text: "Fiction is the lie through which we tell the truth.", author: "Albert Camus" },
    { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" },
    { text: "We tell ourselves stories in order to live.", author: "Joan Didion" },
    { text: "I write to find out what I know.", author: "Flannery O'Connor" }
];

export default function QuoteBreak() {
    const [quote, setQuote] = useState(QUOTES[0]);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        // Pick random quote
        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                <Text style={styles.quoteText}>“{quote.text}”</Text>
                <Text style={styles.author}>— {quote.author}</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9F7F1',
    },
    quoteText: {
        fontFamily: 'serif',
        fontSize: 24,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#444',
        marginBottom: 10,
        maxWidth: 600,
        lineHeight: 36,
    },
    author: {
        fontFamily: 'serif',
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
        letterSpacing: 1,
    },
});

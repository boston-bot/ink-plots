import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';

export default function Submit() {
    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#fff', flexGrow: 1 }}>
            <Stack.Screen options={{ title: 'Submit Work' }} />
            <Text style={{ fontFamily: 'serif', fontSize: 28, marginBottom: 20, marginTop: 10 }}>Submit to Ink Plots</Text>
            <Text style={{ lineHeight: 24, fontSize: 16, fontFamily: 'serif', marginBottom: 20 }}>
                We are looking for voices that stand out. Our curatorial focus is on the unique, the bold, and the beautifully written.
            </Text>
            <Text style={{ lineHeight: 24, fontSize: 16, fontFamily: 'serif' }}>
                Current theme: "Whispers in the Static".
            </Text>
            {/* Form would go here */}
        </ScrollView>
    );
}

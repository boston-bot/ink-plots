import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';

export default function Reader() {
    const { id } = useLocalSearchParams();

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: '#fff', padding: 20 }}>
            <Stack.Screen options={{ title: '' }} />

            <Text style={{ fontFamily: 'serif', fontSize: 32, marginBottom: 20, textAlign: 'center' }}>
                Chapter One
            </Text>
            <Text style={{ fontFamily: 'serif', fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 40 }}>
                Book ID: {id}
            </Text>

            <Text style={{ fontFamily: 'serif', fontSize: 20, lineHeight: 32, marginBottom: 20 }}>
                The night was quiet, save for the hum of the server racks. It was a digital silence, heavy with potential.
                She looked at the screen, the cursor blinking like a heartbeat.
            </Text>
            <Text style={{ fontFamily: 'serif', fontSize: 20, lineHeight: 32 }}>
                "This is it," she whispered. "The final commit."
            </Text>
        </ScrollView>
    );
}

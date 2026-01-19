import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function Submit() {
    const router = useRouter();

    return (
        <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: '#fff', flexGrow: 1 }}>
            <Stack.Screen options={{
                title: 'Submit Work',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}>
                        <ChevronLeft color="#000" size={28} />
                        <Text style={{ fontSize: 17, color: '#000', marginLeft: -4 }}>Back</Text>
                    </TouchableOpacity>
                ),
                headerBackVisible: false, // Hide native back button
            }} />
            <Text style={{ fontFamily: 'serif', fontSize: 28, marginBottom: 20, marginTop: 10 }}>Submit to The Ink Plots</Text>
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

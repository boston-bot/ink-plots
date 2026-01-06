import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: '#F9F7F1' },
            headerTintColor: '#000',
            headerTitleStyle: { fontFamily: 'serif', fontWeight: 'bold' },
            contentStyle: { backgroundColor: '#F9F7F1' },
        }} />
    );
}

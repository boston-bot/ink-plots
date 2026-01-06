import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <Stack screenOptions={{
            headerStyle: { backgroundColor: '#fff' },
            headerTintColor: '#000',
            headerTitleStyle: { fontFamily: 'serif', fontWeight: 'bold' },
            contentStyle: { backgroundColor: '#fff' },
        }} />
    );
}

import { Slot } from 'expo-router';
import WebSidebar from '../../components/WebSidebar';

export default function WIPLayout() {
    return (
        <WebSidebar>
            <Slot />
        </WebSidebar>
    );
}

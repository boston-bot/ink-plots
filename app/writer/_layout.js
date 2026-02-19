import { Slot } from 'expo-router';
import WebSidebar from '../../components/WebSidebar';

export default function WriterLayout() {
    return (
        <WebSidebar>
            <Slot />
        </WebSidebar>
    );
}

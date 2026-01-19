import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { X, Type, Sun, Moon, BookOpen } from 'lucide-react-native';

export default function ReaderSettings({ visible, onClose, settings, onUpdate }) {
    if (!visible) return null;

    const themes = [
        { id: 'light', label: 'Light', bg: '#ffffff', text: '#000000', icon: Sun },
        { id: 'sepia', label: 'Sepia', bg: '#FBF0D9', text: '#5F4B32', icon: BookOpen },
        { id: 'dark', label: 'Dark', bg: '#1a1a1a', text: '#cccccc', icon: Moon },
    ];

    const fonts = [
        { id: 'serif', label: 'Serif', family: 'serif' },
        { id: 'sans', label: 'Sans', family: 'system' }, // 'system' usually resolves to San Francisco / Roboto
    ];

    return (
        <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.container, { backgroundColor: settings.theme === 'dark' ? '#222' : '#fff' }]}>

                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: settings.theme === 'dark' ? '#fff' : '#000' }]}>Appearance</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <X color={settings.theme === 'dark' ? '#fff' : '#000'} size={24} />
                                </TouchableOpacity>
                            </View>

                            {/* Theme Selector */}
                            <View style={styles.section}>
                                <Text style={[styles.label, { color: settings.theme === 'dark' ? '#aaa' : '#666' }]}>THEME</Text>
                                <View style={styles.row}>
                                    {themes.map(theme => (
                                        <TouchableOpacity
                                            key={theme.id}
                                            onPress={() => onUpdate({ ...settings, theme: theme.id })}
                                            style={[
                                                styles.themeOption,
                                                { backgroundColor: theme.bg, borderColor: settings.theme === theme.id ? '#007AFF' : 'transparent', borderWidth: 2 }
                                            ]}
                                        >
                                            <theme.icon size={20} color={theme.text} />
                                            <Text style={{ color: theme.text, fontSize: 12, marginTop: 4 }}>{theme.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Font Family */}
                            <View style={styles.section}>
                                <Text style={[styles.label, { color: settings.theme === 'dark' ? '#aaa' : '#666' }]}>FONT</Text>
                                <View style={styles.segmentControl}>
                                    {fonts.map(font => (
                                        <TouchableOpacity
                                            key={font.id}
                                            onPress={() => onUpdate({ ...settings, fontFamily: font.id })}
                                            style={[
                                                styles.segmentBtn,
                                                settings.fontFamily === font.id && styles.segmentBtnActive,
                                                { backgroundColor: settings.theme === 'dark' ? (settings.fontFamily === font.id ? '#444' : '#333') : (settings.fontFamily === font.id ? '#eee' : '#fff') }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.segmentText,
                                                { fontFamily: font.family, color: settings.theme === 'dark' ? '#fff' : '#000' }
                                            ]}>
                                                {font.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Font Size */}
                            <View style={styles.section}>
                                <Text style={[styles.label, { color: settings.theme === 'dark' ? '#aaa' : '#666' }]}>SIZE</Text>
                                <View style={styles.row}>
                                    <TouchableOpacity
                                        style={[styles.sizeBtn, { backgroundColor: settings.theme === 'dark' ? '#333' : '#f0f0f0' }]}
                                        onPress={() => onUpdate({ ...settings, fontSize: Math.max(12, settings.fontSize - 2) })}
                                    >
                                        <Text style={{ fontSize: 14, color: settings.theme === 'dark' ? '#fff' : '#000' }}>A</Text>
                                    </TouchableOpacity>

                                    <View style={{ paddingHorizontal: 20 }}>
                                        <Text style={{ fontSize: 16, color: settings.theme === 'dark' ? '#fff' : '#000' }}>{settings.fontSize}px</Text>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.sizeBtn, { backgroundColor: settings.theme === 'dark' ? '#333' : '#f0f0f0' }]}
                                        onPress={() => onUpdate({ ...settings, fontSize: Math.min(32, settings.fontSize + 2) })}
                                    >
                                        <Text style={{ fontSize: 20, color: settings.theme === 'dark' ? '#fff' : '#000' }}>A</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    container: {
        padding: 25,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'serif',
    },
    section: {
        marginBottom: 25,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    themeOption: {
        width: '30%',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        height: 70,
    },
    segmentControl: {
        flexDirection: 'row',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    segmentBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentBtnActive: {
        backgroundColor: '#eee',
    },
    segmentText: {
        fontSize: 16,
    },
    sizeBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

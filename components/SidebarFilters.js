import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Filter, X } from 'lucide-react-native';
import { useTheme } from '../lib/theme';

export default function SidebarFilters({
    genres,
    selectedGenre,
    setSelectedGenre,
    readingTime,
    setReadingTime,
    sortBy,
    setSortBy,
    onClose // For mobile drawer
}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const readingTimeOptions = [
        { label: 'Any Length', value: null },
        { label: '< 5 min', value: 5 },
        { label: '5-10 min', value: 10 },
        { label: '10+ min', value: 15 },
    ];

    const sortOptions = [
        { label: 'Newest First', value: 'newest' },
        { label: 'Most Popular', value: 'popular' },
        { label: 'Random', value: 'random' },
    ];

    return (
        <View style={styles.container}>
            {onClose && (
                <View style={styles.mobileHeader}>
                    <View style={styles.titleRow}>
                        <Filter size={20} color="#333" />
                        <Text style={styles.title}>Filters</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                {/* Genre Filter */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Genre</Text>
                    <View style={styles.chipContainer}>
                        {genres.map(genre => (
                            <TouchableOpacity
                                key={genre}
                                style={[
                                    styles.chip,
                                    selectedGenre === genre && styles.chipActive
                                ]}
                                onPress={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    selectedGenre === genre && styles.chipTextActive
                                ]}>{genre}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Reading Time Filter */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Reading Time</Text>
                    {readingTimeOptions.map(option => (
                        <TouchableOpacity
                            key={option.label}
                            style={styles.radioOption}
                            onPress={() => setReadingTime(option.value)}
                        >
                            <View style={styles.radio}>
                                {readingTime === option.value && <View style={styles.radioDot} />}
                            </View>
                            <Text style={styles.radioLabel}>{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sort By */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sort By</Text>
                    {sortOptions.map(option => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.radioOption}
                            onPress={() => setSortBy(option.value)}
                        >
                            <View style={styles.radio}>
                                {sortBy === option.value && <View style={styles.radioDot} />}
                            </View>
                            <Text style={styles.radioLabel}>{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Clear All */}
                <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => {
                        setSelectedGenre(null);
                        setReadingTime(null);
                        setSortBy('newest');
                    }}
                >
                    <Text style={styles.clearText}>Clear All Filters</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        backgroundColor: theme.surface,
        borderRadius: 12,
        padding: 20,
    },
    mobileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'serif',
        color: theme.text,
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        maxHeight: 600,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: 'serif',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: theme.surfaceVariant,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
    },
    chipActive: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    chipText: {
        fontSize: 13,
        color: theme.textSecondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: theme.textSecondary,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.primary,
    },
    radioLabel: {
        fontSize: 14,
        color: theme.text,
        fontFamily: 'serif',
    },
    clearBtn: {
        marginTop: 8,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    clearText: {
        color: theme.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
});

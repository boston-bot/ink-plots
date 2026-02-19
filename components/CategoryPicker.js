import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../lib/theme';

export default function CategoryPicker({ selectedCategories = [], onChangeCategories, multiSelect = true }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [categories, setCategories] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/categories');
            const data = await response.json();
            setCategories(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            setLoading(false);
        }
    };

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const handleCategorySelect = (categoryId) => {
        if (multiSelect) {
            const newSelection = selectedCategories.includes(categoryId)
                ? selectedCategories.filter(id => id !== categoryId)
                : [...selectedCategories, categoryId];
            onChangeCategories(newSelection);
        } else {
            onChangeCategories([categoryId]);
        }
    };

    const isSelected = (categoryId) => selectedCategories.includes(categoryId);

    if (loading) {
        return <Text style={styles.loading}>Loading categories...</Text>;
    }

    return (
        <ScrollView style={styles.container} nestedScrollEnabled>
            {categories.map(group => (
                <View key={group.id} style={styles.groupContainer}>
                    {/* Group Header */}
                    <TouchableOpacity
                        style={styles.groupHeader}
                        onPress={() => toggleGroup(group.id)}
                    >
                        {expandedGroups[group.id] ? (
                            <ChevronDown size={20} color={theme.text} />
                        ) : (
                            <ChevronRight size={20} color={theme.text} />
                        )}
                        <Text style={styles.groupEmoji}>{group.emoji}</Text>
                        <Text style={styles.groupName}>{group.name}</Text>
                    </TouchableOpacity>

                    {/* Group Content */}
                    {expandedGroups[group.id] && (
                        <View style={styles.groupContent}>
                            {group.categories.map(parentCategory => (
                                <View key={parentCategory.id}>
                                    {/* Level 1 Category (with children) */}
                                    {parentCategory.children && parentCategory.children.length > 0 ? (
                                        <>
                                            <TouchableOpacity
                                                style={styles.parentCategory}
                                                onPress={() => toggleCategory(parentCategory.id)}
                                            >
                                                {expandedCategories[parentCategory.id] ? (
                                                    <ChevronDown size={16} color={theme.textSecondary} />
                                                ) : (
                                                    <ChevronRight size={16} color={theme.textSecondary} />
                                                )}
                                                <Text style={styles.parentCategoryText}>
                                                    {parentCategory.name}
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Level 2 Children */}
                                            {expandedCategories[parentCategory.id] && (
                                                <View style={styles.childrenContainer}>
                                                    {parentCategory.children.map(child => (
                                                        <TouchableOpacity
                                                            key={child.id}
                                                            style={[
                                                                styles.childCategory,
                                                                isSelected(child.id) && styles.selectedCategory
                                                            ]}
                                                            onPress={() => handleCategorySelect(child.id)}
                                                        >
                                                            <View style={[
                                                                styles.checkbox,
                                                                isSelected(child.id) && styles.checkboxSelected
                                                            ]}>
                                                                {isSelected(child.id) && (
                                                                    <Text style={styles.checkmark}>✓</Text>
                                                                )}
                                                            </View>
                                                            <Text style={[
                                                                styles.childCategoryText,
                                                                isSelected(child.id) && styles.selectedText
                                                            ]}>
                                                                {child.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}
                                        </>
                                    ) : (
                                        // Level 1 Category without children (selectable)
                                        <TouchableOpacity
                                            style={[
                                                styles.childCategory,
                                                isSelected(parentCategory.id) && styles.selectedCategory
                                            ]}
                                            onPress={() => handleCategorySelect(parentCategory.id)}
                                        >
                                            <View style={[
                                                styles.checkbox,
                                                isSelected(parentCategory.id) && styles.checkboxSelected
                                            ]}>
                                                {isSelected(parentCategory.id) && (
                                                    <Text style={styles.checkmark}>✓</Text>
                                                )}
                                            </View>
                                            <Text style={[
                                                styles.childCategoryText,
                                                isSelected(parentCategory.id) && styles.selectedText
                                            ]}>
                                                {parentCategory.name}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        maxHeight: 400,
    },
    loading: {
        padding: 20,
        textAlign: 'center',
        color: theme.textSecondary,
    },
    groupContainer: {
        marginBottom: 8,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: theme.surface,
        borderRadius: 8,
        gap: 8,
    },
    groupEmoji: {
        fontSize: 18,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.text,
        flex: 1,
    },
    groupContent: {
        paddingLeft: 16,
        paddingTop: 8,
    },
    parentCategory: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingLeft: 8,
        gap: 8,
    },
    parentCategoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.textSecondary,
    },
    childrenContainer: {
        paddingLeft: 24,
    },
    childCategory: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 10,
        borderRadius: 6,
    },
    selectedCategory: {
        backgroundColor: theme.surface,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: theme.border || '#ddd',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    checkmark: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    childCategoryText: {
        fontSize: 14,
        color: theme.text,
        flex: 1,
    },
    selectedText: {
        fontWeight: '600',
        color: theme.primary,
    },
});

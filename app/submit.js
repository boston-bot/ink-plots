import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, useWindowDimensions, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Upload, FileText, Book, Send } from 'lucide-react-native';
import CustomHeader from '../components/CustomHeader';
import CategoryPicker from '../components/CategoryPicker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../lib/theme';

export default function SubmitWork() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width > 1024;
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const [contentType, setContentType] = useState('story'); // 'story' or 'book'
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleFilePick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
                copyToCacheDirectory: true
            });

            if (result.canceled === false && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                setUploadedFile(file);
            }
        } catch (err) {
            console.error('File pick error:', err);
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!title.trim()) {
            Alert.alert('Missing Title', 'Please provide a title for your work.');
            return;
        }
        if (selectedCategories.length === 0) {
            Alert.alert('Missing Category', 'Please select at least one category.');
            return;
        }
        if (!uploadedFile) {
            Alert.alert('Missing File', 'Please upload your manuscript file.');
            return;
        }

        setSubmitting(true);

        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                router.replace('/auth/login');
                return;
            }

            // 1. Upload file to server
            const formData = new FormData();
            formData.append('file', {
                uri: uploadedFile.uri,
                type: uploadedFile.mimeType,
                name: uploadedFile.name
            });

            const uploadResponse = await fetch('http://localhost:3000/api/upload-file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('File upload failed');
            }

            const uploadData = await uploadResponse.json();

            // 2. Create submission with categories
            const submissionData = {
                title,
                description,
                content_type: contentType,
                file_upload_key: uploadData.fileKey,
                is_file_upload: true,
                category_ids: selectedCategories,
                status: 'draft'
            };

            const createResponse = await fetch('http://localhost:3000/api/writer/stories', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(submissionData)
            });

            if (!createResponse.ok) {
                throw new Error('Submission failed');
            }

            const submission = await createResponse.json();

            Alert.alert(
                'Success!',
                'Your work has been submitted successfully.',
                [
                    { text: 'OK', onPress: () => router.push('/writer') }
                ]
            );

        } catch (error) {
            console.error('Submission error:', error);
            Alert.alert('Error', error.message || 'Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <CustomHeader title="Submit Work" />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Intro */}
                <View style={styles.intro}>
                    <Text style={styles.heading}>Submit to Ink Plots</Text>
                    <Text style={styles.introText}>
                        Share your voice with our community. We're looking for unique, bold, and beautifully written work.
                    </Text>
                </View>

                <View style={isLargeScreen ? styles.threePanel : styles.singlePanel}>
                    {/* Left Panel - Metadata */}
                    <View style={[styles.panel, styles.leftPanel, !isLargeScreen && styles.fullWidth]}>
                        <Text style={styles.panelTitle}>Work Details</Text>

                        {/* Type Selector */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Type *</Text>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    style={[styles.typeOption, contentType === 'story' && styles.typeActive]}
                                    onPress={() => setContentType('story')}
                                >
                                    <FileText size={18} color={contentType === 'story' ? '#fff' : '#666'} />
                                    <Text style={[styles.typeOptionText, contentType === 'story' && styles.typeActiveText]}>
                                        Story
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeOption, contentType === 'book' && styles.typeActive]}
                                    onPress={() => setContentType('book')}
                                >
                                    <Book size={18} color={contentType === 'book' ? '#fff' : '#666'} />
                                    <Text style={[styles.typeOptionText, contentType === 'book' && styles.typeActiveText]}>
                                        Book
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Title */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Title *</Text>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Enter your work's title"
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>

                        {/* Description */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Brief description or synopsis..."
                                placeholderTextColor={theme.textTertiary}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>

                    {/* Center Panel - File Upload & Categories */}
                    <View style={[styles.panel, styles.centerPanel, !isLargeScreen && styles.fullWidth]}>
                        <Text style={styles.panelTitle}>Upload & Categories</Text>

                        {/* File Upload */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Manuscript File *</Text>
                            <TouchableOpacity
                                style={styles.uploadZone}
                                onPress={handleFilePick}
                                disabled={uploading}
                            >
                                <Upload size={32} color={theme.primary} />
                                {uploadedFile ? (
                                    <>
                                        <Text style={styles.uploadedFileName}>{uploadedFile.name}</Text>
                                        <Text style={styles.uploadHint}>Tap to change file</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.uploadText}>Click to upload</Text>
                                        <Text style={styles.uploadHint}>Supports .docx and .txt files</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Categories */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Categories * {selectedCategories.length > 0 && `(${selectedCategories.length} selected)`}</Text>
                            <CategoryPicker
                                selectedCategories={selectedCategories}
                                onChangeCategories={setSelectedCategories}
                                multiSelect={true}
                            />
                        </View>
                    </View>

                    {/* Right Panel - Preview & Submit */}
                    <View style={[styles.panel, styles.rightPanel, !isLargeScreen && styles.fullWidth]}>
                        <Text style={styles.panelTitle}>Review & Submit</Text>

                        <View style={styles.previewBox}>
                            <Text style={styles.previewLabel}>Type</Text>
                            <Text style={styles.previewValue}>{contentType === 'story' ? '📝 Story' : '📚 Book'}</Text>

                            <Text style={styles.previewLabel}>Title</Text>
                            <Text style={styles.previewValue}>{title || '(No title yet)'}</Text>

                            <Text style={styles.previewLabel}>Categories</Text>
                            <Text style={styles.previewValue}>
                                {selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'None selected'}
                            </Text>

                            <Text style={styles.previewLabel}>File</Text>
                            <Text style={styles.previewValue}>
                                {uploadedFile ? `✓ ${uploadedFile.name}` : 'Not uploaded'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Send size={18} color="#fff" />
                                    <Text style={styles.submitBtnText}>Submit Work</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.hint}>
                            Your work will be saved as a draft. You can publish it later from the Writer Dashboard.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    intro: {
        marginBottom: 24,
    },
    heading: {
        fontSize: 32,
        fontWeight: 'bold',
        fontFamily: 'serif',
        color: theme.text,
        marginBottom: 8,
    },
    introText: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.textSecondary,
        fontFamily: 'serif',
    },
    threePanel: {
        flexDirection: 'row',
        gap: 20,
    },
    singlePanel: {
        gap: 20,
    },
    panel: {
        backgroundColor: theme.surface,
        borderRadius: 12,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    fullWidth: {
        width: '100%',
    },
    leftPanel: {
        flex: 1,
        maxWidth: 320,
    },
    centerPanel: {
        flex: 2,
    },
    rightPanel: {
        flex: 1,
        maxWidth: 300,
    },
    panelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'serif',
        marginBottom: 20,
        color: theme.text,
    },
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: theme.text,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.border || '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        backgroundColor: theme.background,
        color: theme.text,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 10,
    },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    typeActive: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    typeOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    typeActiveText: {
        color: '#fff',
    },
    uploadZone: {
        borderWidth: 2,
        borderColor: theme.primary,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
    },
    uploadText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: theme.text,
    },
    uploadedFileName: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
        color: theme.primary,
    },
    uploadHint: {
        marginTop: 4,
        fontSize: 13,
        color: theme.textSecondary,
    },
    previewBox: {
        backgroundColor: theme.background,
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },
    previewLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.textSecondary,
        marginTop: 12,
        marginBottom: 4,
    },
    previewValue: {
        fontSize: 14,
        color: theme.text,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        backgroundColor: theme.primary,
        borderRadius: 8,
        marginBottom: 12,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    hint: {
        fontSize: 12,
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
});

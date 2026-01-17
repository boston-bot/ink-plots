import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import AnimatedEntry from './AnimatedEntry';
import BookCard from './BookCard';

const VIEW_ITEM_WIDTH = 160;
const VIEW_ITEM_MARGIN = 40;
const TOTAL_ITEM_WIDTH = VIEW_ITEM_WIDTH + VIEW_ITEM_MARGIN;
const SCROLL_STEP = 5 * TOTAL_ITEM_WIDTH; // 1000px

export default function GenreSection({ title, books, getImageUrl, delay }) {
    const scrollRef = useRef(null);
    const [scrollX, setScrollX] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [layoutWidth, setLayoutWidth] = useState(0);

    const scroll = (direction) => {
        if (!scrollRef.current) return;

        const target = direction === 'left'
            ? Math.max(0, scrollX - SCROLL_STEP)
            : Math.min(contentWidth - layoutWidth, scrollX + SCROLL_STEP);

        scrollRef.current.scrollTo({ x: target, animated: true });
        setScrollX(target);
    };

    const onScroll = (event) => {
        setScrollX(event.nativeEvent.contentOffset.x);
    };

    const canScrollLeft = scrollX > 10; // small buffer
    const canScrollRight = contentWidth > 0 && layoutWidth > 0 && (scrollX + layoutWidth) < (contentWidth - 10);

    return (
        <AnimatedEntry delay={delay} style={{ marginBottom: 50, position: 'relative' }}>
            <Text style={styles.header}>
                {title}
            </Text>

            <View>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 20, paddingBottom: 10, paddingLeft: 10 }}
                    style={{ flexGrow: 0 }}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    onContentSizeChange={(w) => setContentWidth(w)}
                    onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
                >
                    {books.map((book) => (
                        <View key={book.id} style={{ marginRight: VIEW_ITEM_MARGIN, width: VIEW_ITEM_WIDTH }}>
                            <BookCard
                                id={book.id}
                                title={book.title}
                                author={book.author}
                                coverColor={book.cover_color}
                                coverImage={getImageUrl(book.cover_image_url)}
                            />
                        </View>
                    ))}
                </ScrollView>

                {/* Floating Navigation Buttons */}
                {canScrollLeft && (
                    <Pressable onPress={() => scroll('left')} style={[styles.navButton, { left: 0 }]}>
                        <ChevronLeft color="#333" size={24} />
                    </Pressable>
                )}

                {canScrollRight && (
                    <Pressable onPress={() => scroll('right')} style={[styles.navButton, { right: 0 }]}>
                        <ChevronRight color="#333" size={24} />
                    </Pressable>
                )}
            </View>
        </AnimatedEntry>
    );
}

const styles = StyleSheet.create({
    header: {
        fontSize: 18,
        fontFamily: 'serif',
        fontWeight: 'bold',
        marginBottom: 20,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 5,
        alignSelf: 'flex-start',
        paddingRight: 20
    },
    navButton: {
        position: 'absolute',
        top: '40%', // Center vertically relative to list
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 100
    }
});

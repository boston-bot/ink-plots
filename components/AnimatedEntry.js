import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export default function AnimatedEntry({ children, delay = 0, style }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 800,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 800,
                delay: delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [delay]);

    const animatedStyle = {
        opacity: opacity,
        transform: [{ translateY: translateY }],
    };

    return (
        <Animated.View style={[style, animatedStyle]}>
            {children}
        </Animated.View>
    );
}

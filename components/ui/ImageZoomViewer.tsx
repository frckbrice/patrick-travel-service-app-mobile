import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Modal, TouchableOpacity, StatusBar, Text } from 'react-native';
import { Image } from 'react-native';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedGestureHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import { COLORS, SPACING } from '../../lib/constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ImageZoomViewerProps {
    imageUri: string;
    visible: boolean;
    onClose: () => void;
}

export const ImageZoomViewer: React.FC<ImageZoomViewerProps> = ({
    imageUri,
    visible,
    onClose,
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    // Animation values
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);

    const resetImage = () => {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
    };

    const pinchGestureHandler = useAnimatedGestureHandler({
        onStart: (_, context: any) => {
            context.startScale = scale.value;
        },
        onActive: (event, context) => {
            scale.value = Math.max(0.5, Math.min(context.startScale * event.scale, 5));
            focalX.value = event.focalX;
            focalY.value = event.focalY;
        },
        onEnd: () => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
            }
        },
    });

    const panGestureHandler = useAnimatedGestureHandler({
        onStart: (_, context: any) => {
            context.startX = translateX.value;
            context.startY = translateY.value;
        },
        onActive: (event, context) => {
            if (scale.value > 1) {
                translateX.value = context.startX + event.translationX;
                translateY.value = context.startY + event.translationY;
            }
        },
        onEnd: () => {
            // Keep image within bounds
            const maxTranslateX = (screenWidth * (scale.value - 1)) / 2;
            const maxTranslateY = (screenHeight * (scale.value - 1)) / 2;

            if (Math.abs(translateX.value) > maxTranslateX) {
                translateX.value = withSpring(Math.sign(translateX.value) * maxTranslateX);
            }
            if (Math.abs(translateY.value) > maxTranslateY) {
                translateY.value = withSpring(Math.sign(translateY.value) * maxTranslateY);
            }
        },
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
            ],
        };
    });

    const handleClose = () => {
        resetImage();
        setImageLoaded(false);
        onClose();
    };

    const handleDoubleTap = () => {
        if (scale.value > 1) {
            resetImage();
        } else {
            scale.value = withSpring(2);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={handleClose}
        >
            <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <IconButton
                        icon="close"
                        size={24}
                        iconColor={COLORS.surface}
                        onPress={handleClose}
                        style={styles.closeButton}
                    />
                </View>

                {/* Image Container */}
                <View style={styles.imageContainer}>
                    <PanGestureHandler onGestureEvent={panGestureHandler}>
                        <Animated.View style={styles.panContainer}>
                            <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
                                <Animated.View style={animatedStyle}>
                                    <TouchableOpacity
                                        activeOpacity={1}
                                        onPress={handleDoubleTap}
                                        style={styles.imageTouchable}
                                    >
                                        <Image
                                            source={{ uri: imageUri }}
                                            style={styles.image}
                                            resizeMode="contain"
                                            onLoad={() => setImageLoaded(true)}
                                        />
                                    </TouchableOpacity>
                                </Animated.View>
                            </PinchGestureHandler>
                        </Animated.View>
                    </PanGestureHandler>
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                    <View style={styles.instructionItem}>
                        <MaterialCommunityIcons
                            name="gesture-tap"
                            size={16}
                            color={COLORS.surface}
                        />
                        <Text style={styles.instructionText}>Double tap to zoom</Text>
                    </View>
                    <View style={styles.instructionItem}>
                        <MaterialCommunityIcons
                            name="gesture-pinch"
                            size={16}
                            color={COLORS.surface}
                        />
                        <Text style={styles.instructionText}>Pinch to zoom</Text>
                    </View>
                    <View style={styles.instructionItem}>
                        <MaterialCommunityIcons
                            name="gesture-swipe"
                            size={16}
                            color={COLORS.surface}
                        />
                        <Text style={styles.instructionText}>Drag to pan</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: SPACING.xl,
        paddingHorizontal: SPACING.md,
        alignItems: 'flex-end',
    },
    closeButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    panContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageTouchable: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: screenWidth,
        height: screenHeight,
    },
    instructions: {
        position: 'absolute',
        bottom: SPACING.xl,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: SPACING.lg,
    },
    instructionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: 16,
    },
    instructionText: {
        color: COLORS.surface,
        fontSize: 12,
        fontWeight: '500',
    },
});


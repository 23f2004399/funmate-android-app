/**
 * CUSTOM CARD SWIPER COMPONENT
 * 
 * Simple, reliable card swiper using PanGestureHandler
 * Built specifically for Funmate to avoid third-party library issues
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;
const SWIPE_OUT_DURATION = 250;

interface CardSwiperProps {
  data: any[];
  renderCard: (item: any, index: number) => React.ReactElement | null;
  onSwipeRight?: (index: number) => void;
  onSwipeLeft?: (index: number) => void;
  onSwipedAll?: () => void;
  cardStyle?: any;
  stackSize?: number;
  overlayOpacityHorizontalThreshold?: number;
  overlayOpacityVerticalThreshold?: number;
}

export const CardSwiper: React.FC<CardSwiperProps> = ({
  data,
  renderCard,
  onSwipeRight,
  onSwipeLeft,
  onSwipedAll,
  cardStyle,
  stackSize = 3,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = new Animated.ValueXY();

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const forceSwipe = useCallback((direction: 'right' | 'left') => {
    const x = direction === 'right' ? width + 100 : -width - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  }, [currentIndex]);

  const onSwipeComplete = (direction: 'right' | 'left') => {
    const item = data[currentIndex];
    
    if (direction === 'right' && onSwipeRight) {
      onSwipeRight(currentIndex);
    } else if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft(currentIndex);
    }

    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(currentIndex + 1);

    if (currentIndex >= data.length - 1 && onSwipedAll) {
      onSwipedAll();
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        forceSwipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        forceSwipe('left');
      } else {
        resetPosition();
      }
    },
  });

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-width * 1.5, 0, width * 1.5],
      outputRange: ['-30deg', '0deg', '30deg'],
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const renderCards = () => {
    if (currentIndex >= data.length) {
      return null;
    }

    return data
      .map((item, i) => {
        if (i < currentIndex) {
          return null;
        }

        if (i === currentIndex) {
          return (
            <Animated.View
              key={i}
              style={[styles.card, getCardStyle(), cardStyle]}
              {...panResponder.panHandlers}
            >
              {renderCard(item, i)}
            </Animated.View>
          );
        }

        // Stack cards
        if (i < currentIndex + stackSize) {
          return (
            <Animated.View
              key={i}
              style={[
                styles.card,
                {
                  top: 10 * (i - currentIndex),
                  transform: [{ scale: 1 - 0.05 * (i - currentIndex) }],
                  opacity: 1 - 0.2 * (i - currentIndex),
                },
                cardStyle,
              ]}
            >
              {renderCard(item, i)}
            </Animated.View>
          );
        }

        return null;
      })
      .reverse();
  };

  return (
    <View style={styles.container}>
      {renderCards()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: width * 0.9,
  },
});

export default CardSwiper;

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AccountTypeScreenProps {
  navigation: any;
}

const AccountTypeScreen = ({ navigation }: AccountTypeScreenProps) => {
  const insets = useSafeAreaInsets();
  const [openCard, setOpenCard] = useState<string | null>(null);
  const explorerCardSlide = useRef(new Animated.Value(-400)).current;
  const hostCardSlide = useRef(new Animated.Value(400)).current;
  const explorerCircleScale = useRef(new Animated.Value(1)).current;
  const hostCircleScale = useRef(new Animated.Value(1)).current;

  // Bubble animations
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble6Y = useRef(new Animated.Value(0)).current;

  const slideCard = (cardAnim: Animated.Value, open: boolean, direction: 'left' | 'right') => {
    Animated.spring(cardAnim, {
      toValue: open ? 0 : (direction === 'right' ? 400 : -400),
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const scaleCircle = (circleAnim: Animated.Value, shrink: boolean) => {
    Animated.spring(circleAnim, {
      toValue: shrink ? 0.3 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  useEffect(() => {
    // Card slide animations
    if (openCard === 'explorer') {
      slideCard(explorerCardSlide, true, 'left');
      slideCard(hostCardSlide, false, 'right');
      scaleCircle(explorerCircleScale, true);
      scaleCircle(hostCircleScale, false);
    } else if (openCard === 'host') {
      slideCard(hostCardSlide, true, 'right');
      slideCard(explorerCardSlide, false, 'left');
      scaleCircle(hostCircleScale, true);
      scaleCircle(explorerCircleScale, false);
    } else {
      slideCard(explorerCardSlide, false, 'left');
      slideCard(hostCardSlide, false, 'right');
      scaleCircle(explorerCircleScale, false);
      scaleCircle(hostCircleScale, false);
    }

    // Bubble animations
    const createBubbleAnimation = (animatedValue: Animated.Value, duration: number, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: -30,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 30,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      createBubbleAnimation(bubble1Y, 4000, 0),
      createBubbleAnimation(bubble2Y, 5000, 500),
      createBubbleAnimation(bubble3Y, 3500, 1000),
      createBubbleAnimation(bubble4Y, 4500, 300),
      createBubbleAnimation(bubble5Y, 3800, 700),
      createBubbleAnimation(bubble6Y, 4200, 200),
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [openCard]);

  const handleCirclePress = (type: string) => {
    setOpenCard(openCard === type ? null : type);
  };

  const handleCardPress = (type: string) => {
    if (openCard !== type) return; // Only navigate if this card is open
    console.log(`Navigating to ${type} account`);
    setOpenCard(null); // Close card immediately to prevent double-tap
    navigation.navigate('PhoneNumber', { accountType: type === 'explorer' ? 'user' : 'creator' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" translucent={true} />

      {/* Floating Bubbles */}
      <Animated.View style={[styles.bubble, styles.bubble1, { transform: [{ translateY: bubble1Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble2, { transform: [{ translateY: bubble2Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble3, { transform: [{ translateY: bubble3Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble4, { transform: [{ translateY: bubble4Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble5, { transform: [{ translateY: bubble5Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble6, { transform: [{ translateY: bubble6Y }] }]} />

      {/* Background overlay to close cards when clicked */}
      {openCard && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpenCard(null)}
        />
      )}

      {/* Invisible card tap zones - always on top */}
      {openCard === 'explorer' && (
        <Pressable
          style={styles.explorerCardTapZone}
          onPress={() => {
            console.log('Explorer tap zone pressed');
            navigation.navigate('PhoneNumber', { accountType: 'user' });
          }}
        />
      )}
      {openCard === 'host' && (
        <Pressable
          style={styles.hostCardTapZone}
          onPress={() => {
            console.log('Host tap zone pressed');
            navigation.navigate('PhoneNumber', { accountType: 'creator' });
          }}
        />
      )}

      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.title}>Join Funmate</Text>
        <Text style={styles.subtitle}>Choose your journey</Text>
      </View>

      {/* Circle and Card Container */}
      <View style={styles.contentArea}>
        {/* Explorer Section - Left Top */}
        <View style={styles.explorerContainer}>
          <TouchableOpacity
            onPress={() => handleCirclePress('explorer')}
            activeOpacity={0.8}
            disabled={openCard === 'explorer'}
          >
            <Animated.View style={[
              styles.circle,
              openCard === 'explorer' && styles.circleActive,
              { transform: [{ scale: explorerCircleScale }] }
            ]}>
              <Text style={styles.circleText}>Explorer</Text>
            </Animated.View>
          </TouchableOpacity>
          
          {/* Explorer Card - slides from left screen edge */}
          <Animated.View
            style={[
              styles.card,
              styles.explorerCard,
              { transform: [{ translateX: explorerCardSlide }] }
            ]}
          >
            <Pressable
              onPress={() => handleCardPress('explorer')}
              style={styles.cardTouchable}
            >
              <Text style={styles.cardTitle}>Join as Explorer</Text>
              <Text style={styles.cardDescription}>
                Swipe, match, and discover events with people who share your vibe
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Host Section - Right Bottom */}
        <View style={styles.hostContainer}>
          {/* Host Card - slides from right screen edge */}
          <Animated.View
            style={[
              styles.card,
              styles.hostCard,
              { transform: [{ translateX: hostCardSlide }] }
            ]}
          >
            <Pressable
              onPress={() => handleCardPress('host')}
              style={styles.cardTouchable}
            >
              <Text style={styles.cardTitle}>Join as Event Host</Text>
              <Text style={styles.cardDescription}>
                Create experiences, manage events, and monetize your community
              </Text>
            </Pressable>
          </Animated.View>

          <TouchableOpacity
            onPress={() => handleCirclePress('host')}
            activeOpacity={0.8}
            disabled={openCard === 'host'}
          >
            <Animated.View style={[
              styles.circle,
              openCard === 'host' && styles.circleActive,
              { transform: [{ scale: hostCircleScale }] }
            ]}>
              <Text style={styles.circleText}>Host</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, { marginBottom: Math.max(24, insets.bottom) }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1621',
    paddingHorizontal: 24,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#378BBB',
    opacity: 0.08,
  },
  bubble1: {
    width: 100,
    height: 100,
    top: '8%',
    left: '5%',
  },
  bubble2: {
    width: 70,
    height: 70,
    top: '20%',
    right: '8%',
  },
  bubble3: {
    width: 130,
    height: 130,
    top: '60%',
    left: '8%',
  },
  bubble4: {
    width: 90,
    height: 90,
    top: '75%',
    right: '6%',
  },
  bubble5: {
    width: 50,
    height: 50,
    top: '12%',
    right: '28%',
  },
  bubble6: {
    width: 80,
    height: 80,
    top: '85%',
    left: '25%',
  },
  headerSection: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'Inter_24pt-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#B8C7D9',
    lineHeight: 24,
    fontFamily: 'Inter_24pt-Regular',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-around',
    paddingVertical: 40,
  },
  explorerContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginLeft: -15,
    zIndex: 6,
  },
  hostContainer: {
    position: 'relative',
    alignSelf: 'flex-end',
    marginRight: -10,
    zIndex: 6,
  },
  circle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#16283D',
    borderWidth: 3,
    borderColor: '#233B57',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  circleActive: {
    borderColor: '#378BBB',
    borderWidth: 4,
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  circleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#398bbb',
    fontFamily: 'Inter_24pt-Bold',
    textAlign: 'center',
  },
  card: {
    position: 'absolute',
    width: 330,
    height: 210,
    backgroundColor: '#16283D',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#378BBB',
    zIndex: 20,
  },
  explorerCard: {
    top: 0,
    left: 8,
  },
  hostCard: {
    top: 39,
    left: -83,
  },
  cardTouchable: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#378BBB',
    marginBottom: 12,
    fontFamily: 'Inter_24pt-Bold',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: '#B8C7D9',
    lineHeight: 20,
    fontFamily: 'Inter_24pt-Regular',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#233B57',
  },
  backButtonText: {
    fontSize: 15,
    color: '#7F93AA',
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Regular',
  },
  explorerCardTapZone: {
    position: 'absolute',
    top: 200,
    left: 24,
    width: 330,
    height: 210,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  hostCardTapZone: {
    position: 'absolute',
    top: 420,
    right: 24,
    width: 330,
    height: 210,
    zIndex: 100,
    backgroundColor: 'transparent',
  },
});

export default AccountTypeScreen;

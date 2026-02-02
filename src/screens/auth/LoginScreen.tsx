import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  // Bubble animations
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble6Y = useRef(new Animated.Value(0)).current;
  const bubble7Y = useRef(new Animated.Value(0)).current;
  const bubble8Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
      createBubbleAnimation(bubble7Y, 3900, 400),
      createBubbleAnimation(bubble8Y, 4300, 600),
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, []);

  const handlePhoneLogin = () => {
    console.log('Phone login pressed');
    // Navigate to phone number screen with isLogin flag
    navigation.navigate('PhoneNumber', { isLogin: true });
  };

  const handleEmailLogin = () => {
    console.log('Email login pressed');
    // TODO: Navigate to email login
  };

  const handleCreateAccount = () => {
    navigation.navigate('AccountType');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" />
      
      {/* Floating Bubbles */}
      <Animated.View style={[styles.bubble, styles.bubble1, { transform: [{ translateY: bubble1Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble2, { transform: [{ translateY: bubble2Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble3, { transform: [{ translateY: bubble3Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble4, { transform: [{ translateY: bubble4Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble5, { transform: [{ translateY: bubble5Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble6, { transform: [{ translateY: bubble6Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble7, { transform: [{ translateY: bubble7Y }] }]} />
      <Animated.View style={[styles.bubble, styles.bubble8, { transform: [{ translateY: bubble8Y }] }]} />
      
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Text style={styles.appName}>Funmate</Text>
        <Text style={styles.tagline}>Find Fun. Find Friends. Find Love.</Text>
      </View>

      {/* Login Options */}
      <View style={styles.loginSection}>
        <TouchableOpacity
          onPress={handlePhoneLogin}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#378BBB', '#4FC3F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Login with Phone</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleEmailLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Login with Email</Text>
        </TouchableOpacity>

        {/* Create Account */}
        <View style={styles.signupSection}>
          <Text style={styles.signupText}>New to Funmate? </Text>
          <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.7}>
            <Text style={styles.signupLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.footerLink}>Terms</Text> &{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1621',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#378BBB',
    opacity: 0.08,
  },
  bubble1: {
    width: 120,
    height: 120,
    top: '10%',
    left: '5%',
  },
  bubble2: {
    width: 80,
    height: 80,
    top: '25%',
    right: '10%',
  },
  bubble3: {
    width: 150,
    height: 150,
    top: '50%',
    left: '10%',
  },
  bubble4: {
    width: 100,
    height: 100,
    top: '70%',
    right: '5%',
  },
  bubble5: {
    width: 60,
    height: 60,
    top: '15%',
    right: '25%',
  },
  bubble6: {
    width: 90,
    height: 90,
    top: '80%',
    left: '20%',
  },
  bubble7: {
    width: 70,
    height: 70,
    top: '32%',
    left: '15%',
  },
  bubble8: {
    width: 110,
    height: 110,
    top: '37%',
    left: '38%',
  },
  logoSection: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
    fontFamily: 'Inter_24pt-Bold',
  },
  tagline: {
    fontSize: 16,
    color: '#7F93AA',
    marginTop: 12,
    fontWeight: '400',
    fontFamily: 'Inter_24pt-Regular',
  },
  loginSection: {
    flex: 2,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#378BBB',
  },
  secondaryButtonText: {
    color: '#378BBB',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signupText: {
    fontSize: 15,
    color: '#7F93AA',
    fontFamily: 'Inter_24pt-Regular',
  },
  signupLink: {
    fontSize: 15,
    color: '#378BBB',
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  footer: {
    flex: 0.5,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#7F93AA',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Inter_24pt-Regular',
  },
  footerLink: {
    color: '#378BBB',
    fontWeight: '500',
    fontFamily: 'Inter_24pt-Bold',
  },
});

export default LoginScreen;

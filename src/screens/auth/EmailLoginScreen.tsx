/**
 * EMAIL LOGIN SCREEN
 * 
 * Two login options:
 * 1. Continue with Google - For users who signed up with Google
 * 2. Email/Password - For users who signed up with email/password
 * 
 * Firebase automatically validates the correct credential type:
 * - Google signup → Must use Google login
 * - Email/password signup → Must use email/password login
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';

interface EmailLoginScreenProps {
  navigation: any;
}

const EmailLoginScreen: React.FC<EmailLoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Bubble animations
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble6Y = useRef(new Animated.Value(0)).current;

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
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, []);

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handle Google Sign-In Login
   */
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();

      // Sign out first to force account selection
      await GoogleSignin.signOut();

      // Get user info
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo.data?.idToken) {
        throw new Error('Failed to get Google ID token');
      }

      // Create Google credential
      const googleCredential = auth.GoogleAuthProvider.credential(userInfo.data.idToken);

      // Sign in with Google credential
      const userCredential = await auth().signInWithCredential(googleCredential);
      const userId = userCredential.user.uid;

      // Check if account exists
      const accountDoc = await firestore().collection('accounts').doc(userId).get();
      
      if (!accountDoc.exists || !accountDoc.data()) {
        // Account doesn't exist
        await auth().signOut();
        setGoogleLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Account Not Found',
          text2: 'No account found with this Google account. Please sign up first.',
          visibilityTime: 4000,
        });
        return;
      }

      setGoogleLoading(false);
      Toast.show({
        type: 'success',
        text1: 'Login Successful!',
        text2: 'Welcome back to Funmate',
        visibilityTime: 3000,
      });

      // Navigate to main app
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' as never }],
        });
      }, 1500);

    } catch (error: any) {
      setGoogleLoading(false);
      console.error('Google login error:', error);

      let errorMessage = 'Failed to sign in with Google';
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'This email is registered with email/password. Please use email/password login.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid Google credentials';
      }

      Toast.show({
        type: 'error',
        text1: 'Google Login Failed',
        text2: errorMessage,
        visibilityTime: 4000,
      });
    }
  };

  /**
   * Handle Email/Password Login
   */
  const handleEmailLogin = async () => {
    // Validation
    if (!email.trim() || !isValidEmail(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
        visibilityTime: 3000,
      });
      return;
    }

    if (!password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please enter your password',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Sign in with email and password
      const userCredential = await auth().signInWithEmailAndPassword(email.trim(), password);
      const userId = userCredential.user.uid;

      // Check if account exists in Firestore
      const accountDoc = await firestore().collection('accounts').doc(userId).get();
      
      if (!accountDoc.exists || !accountDoc.data()) {
        // Account doesn't exist (shouldn't happen, but just in case)
        await auth().signOut();
        setLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Account Not Found',
          text2: 'No account found. Please sign up first.',
          visibilityTime: 4000,
        });
        return;
      }

      setLoading(false);
      Toast.show({
        type: 'success',
        text1: 'Login Successful!',
        text2: 'Welcome back to Funmate',
        visibilityTime: 3000,
      });

      // Navigate to main app
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' as never }],
        });
      }, 1500);

    } catch (error: any) {
      setLoading(false);
      console.error('Email login error:', error);

      let errorMessage = 'Failed to login';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'This email is registered with Google. Please use "Continue with Google" to login.';
      }

      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: errorMessage,
        visibilityTime: 4000,
      });
    }
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

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to continue</Text>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading || loading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#378BBB" />
            ) : (
              <>
                <Svg width="18" height="18" viewBox="0 0 48 48" style={styles.googleIcon}>
                  <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <Path fill="none" d="M0 0h48v48H0z" />
                </Svg>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* OR Divider */}
          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#7F93AA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#7F93AA"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#7F93AA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#7F93AA"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#7F93AA"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleEmailLogin}
            disabled={!email || !password || loading || googleLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(!email || !password) ? ['#233B57', '#233B57'] : ['#378BBB', '#4FC3F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('AccountType')}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
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
    marginBottom: 32,
    fontFamily: 'Inter_24pt-Regular',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#378BBB',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 24,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter_24pt-Bold',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#233B57',
  },
  orText: {
    fontSize: 14,
    color: '#7F93AA',
    marginHorizontal: 16,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B8C7D9',
    marginBottom: 8,
    fontFamily: 'Inter_24pt-Bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#233B57',
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1B2F48',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter_24pt-Regular',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default EmailLoginScreen;

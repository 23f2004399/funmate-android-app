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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface EmailLoginScreenProps {
  navigation: any;
}

const EmailLoginScreen: React.FC<EmailLoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
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
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color="#DB4437" style={styles.googleIcon} />
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
              <Ionicons name="mail-outline" size={20} color="#999999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#999999"
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
              <Ionicons name="lock-closed-outline" size={20} color="#999999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#999999"
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
                  color="#999999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, (!email || !password) && styles.loginButtonDisabled]}
            onPress={handleEmailLogin}
            disabled={!email || !password || loading || googleLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  orText: {
    fontSize: 14,
    color: '#999999',
    marginHorizontal: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#FFB3BC',
    elevation: 0,
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 15,
    color: '#666666',
  },
  signupLink: {
    fontSize: 15,
    color: '#FF4458',
    fontWeight: '600',
  },
});

export default EmailLoginScreen;

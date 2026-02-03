/**
 * CREATOR GOOGLE PROFILE SETUP SCREEN
 * 
 * After linking Google credential to phone auth, this screen collects:
 * - Full Name (pre-filled from Google, editable)
 * - Username (required)
 * 
 * No DOB or Gender (creator accounts don't need dating fields)
 * 
 * Database Updates:
 * - Creates accounts/{accountId} with role: "event_creator", emailVerified: true
 * - Creates users/{userId} with minimal creator profile
 * 
 * Next: CreatorTypeSelection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface CreatorGoogleProfileSetupScreenProps {
  navigation: any;
  route: any;
}

const CreatorGoogleProfileSetupScreen: React.FC<CreatorGoogleProfileSetupScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { googleUser } = route.params;
  const [fullName, setFullName] = useState(googleUser.displayName || '');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setCheckingUsername(true);
      try {
        const snapshot = await firestore()
          .collection('users')
          .where('username', '==', username.toLowerCase())
          .limit(1)
          .get();
        
        setUsernameAvailable(snapshot.empty);
      } catch (error) {
        console.error('Username check error:', error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const validateForm = () => {
    if (!fullName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Name Required',
        text2: 'Please enter your name',
        visibilityTime: 3000,
      });
      return false;
    }
    if (!username.trim() || username.length < 3) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Username',
        text2: 'Username must be at least 3 characters',
        visibilityTime: 3000,
      });
      return false;
    }
    if (usernameAvailable === false) {
      Toast.show({
        type: 'error',
        text1: 'Username Taken',
        text2: 'This username is already in use',
        visibilityTime: 3000,
      });
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      const accountId = user.uid;

      // Create account document (Google users are auto-verified)
      await firestore().collection('accounts').doc(accountId).set({
        authUid: user.uid,
        role: 'event_creator',
        creatorType: null, // Set later in CreatorTypeSelection
        status: 'pending_verification',
        phoneVerified: true, // Phone was verified first
        emailVerified: true, // Google accounts are verified
        identityVerified: false,
        bankVerified: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create user document (minimal creator profile)
      await firestore().collection('users').doc(accountId).set({
        accountId,
        username: username.toLowerCase(),
        name: fullName,
        // No dating fields (age, gender, bio, interests, photos, etc.)
        creatorDetails: {
          organizationName: null,
          businessAddress: null,
          experienceYears: null,
          bio: null,
          socialLinks: null,
        },
        isVerified: false,
        premiumStatus: 'free',
        signupComplete: false, // Creator hasn't completed setup yet
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
      });

      setLoading(false);
      Toast.show({
        type: 'success',
        text1: 'Profile Created!',
        text2: 'Your Google account is verified',
        visibilityTime: 3000,
      });
      
      setTimeout(() => {
        navigation.navigate('CreatorTypeSelection');
      }, 1000);
    } catch (error: any) {
      setLoading(false);
      console.error('Profile creation error:', error);
      Toast.show({
        type: 'error',
        text1: 'Setup Failed',
        text2: error.message || 'Failed to create profile',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Google Info */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Just a few more details</Text>

          {/* Google Account Info */}
          <View style={styles.googleInfoContainer}>
            {googleUser.photoURL && (
              <Image
                source={{ uri: googleUser.photoURL }}
                style={styles.googleAvatar}
              />
            )}
            <View style={styles.googleTextContainer}>
              <Text style={styles.googleLabel}>Signing in with Google</Text>
              <Text style={styles.googleEmail}>{googleUser.email}</Text>
            </View>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your Name"
              placeholderTextColor="#999999"
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          <View>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameContainer}>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="@username"
                placeholderTextColor="#999999"
                autoCapitalize="none"
                editable={!loading}
              />
              {username.length >= 3 && (
                <View style={styles.usernameStatus}>
                  {checkingUsername ? (
                    <ActivityIndicator size="small" color="#FF4458" />
                  ) : usernameAvailable === true ? (
                    <Text style={styles.availableText}>✓ Available</Text>
                  ) : usernameAvailable === false ? (
                    <Text style={styles.unavailableText}>✗ Taken</Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, { marginBottom: Math.max(32, insets.bottom + 16) }]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
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
  header: {
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  googleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  googleAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  googleTextContainer: {
    flex: 1,
  },
  googleLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  googleEmail: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  form: {
    paddingHorizontal: 32,
    gap: 20,
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
    height: 56,
  },
  usernameContainer: {
    position: 'relative',
  },
  usernameStatus: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  unavailableText: {
    color: '#FF4458',
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 32,
    marginTop: 32,
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default CreatorGoogleProfileSetupScreen;

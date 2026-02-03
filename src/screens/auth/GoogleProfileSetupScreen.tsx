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
  Alert,
  Modal,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import DatePicker from 'react-native-date-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface GoogleProfileSetupScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GoogleProfileSetup'>;
  route: any;
}

const GoogleProfileSetupScreen = ({ navigation, route }: GoogleProfileSetupScreenProps) => {
  const insets = useSafeAreaInsets();
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // 🔥 FIX: Load Google user data with proper null checks and loading state
  useEffect(() => {
    const loadGoogleUserData = async () => {
      try {
        // First check route params
        if (route.params?.googleUser) {
          setGoogleUser(route.params.googleUser);
          setFullName(route.params.googleUser.displayName || '');
          setIsLoadingUserData(false);
          return;
        }

        // Wait for Firebase Auth to initialize
        const currentUser = auth().currentUser;
        if (!currentUser) {
          console.error('No authenticated user found');
          setIsLoadingUserData(false);
          return;
        }

        // Find Google provider in providerData
        const googleProvider = currentUser.providerData?.find(
          provider => provider?.providerId === 'google.com'
        );

        if (googleProvider) {
          const userData = {
            uid: currentUser.uid,
            email: googleProvider.email || currentUser.email || '',
            displayName: googleProvider.displayName || currentUser.displayName || '',
            photoURL: googleProvider.photoURL || currentUser.photoURL || null,
          };
          setGoogleUser(userData);
          setFullName(userData.displayName);
        } else {
          // No Google provider found - shouldn't happen, but handle gracefully
          console.warn('No Google provider found in providerData');
          const fallbackData = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || null,
          };
          setGoogleUser(fallbackData);
          setFullName(fallbackData.displayName);
        }
      } catch (error) {
        console.error('Error loading Google user data:', error);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    loadGoogleUserData();
  }, [route.params]);

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

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateAge = (dobString: string) => {
    const [day, month, year] = dobString.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

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
    if (!dob) {
      Toast.show({
        type: 'error',
        text1: 'Date of Birth Required',
        text2: 'Please select your date of birth',
        visibilityTime: 3000,
      });
      return false;
    }
    if (!gender) {
      Toast.show({
        type: 'error',
        text1: 'Gender Required',
        text2: 'Please select your gender',
        visibilityTime: 3000,
      });
      return false;
    }
    return true;
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'AccountType' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({
        type: 'error',
        text1: 'Logout Failed',
        text2: 'Please try again',
        visibilityTime: 3000,
      });
    }
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
      const age = calculateAge(formatDate(dob!));

      // Create account document (Google users are auto-verified)
      await firestore().collection('accounts').doc(accountId).set({
        authUid: user.uid,
        role: 'user',
        creatorType: null,
        status: 'active',
        phoneVerified: true, // Phone was verified first
        emailVerified: true, // Google accounts are verified
        identityVerified: false,
        bankVerified: false,
        signupStep: 'photos', // User needs to upload photos next
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Create user document
      await firestore().collection('users').doc(accountId).set({
        accountId,
        username: username.toLowerCase(),
        name: fullName,
        age,
        gender: gender.toLowerCase(),
        bio: '',
        relationshipIntent: 'unsure',
        interestedIn: [],
        matchRadiusKm: 50,
        interests: [],
        location: null,
        photos: [], // User will upload photos later
        isVerified: false,
        premiumStatus: 'free',
        premiumExpiresAt: null,
        premiumFeatures: {
          unlimitedSwipes: false,
          seeWhoLikedYou: false,
          audioVideoCalls: false,
          priorityListing: false,
        },
        creatorDetails: null,
        signupComplete: false, // User hasn't completed signup yet
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
      });

      setLoading(false);
      Toast.show({
        type: 'success',
        text1: 'Profile Created!',
        text2: 'Your Google account is verified and ready',
        visibilityTime: 3000,
      });
      
      setTimeout(() => {
        navigation.navigate('PhotoUpload');
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

  // Show loading screen while fetching user data
  if (isLoadingUserData || !googleUser) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0E1621" translucent={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#378BBB" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" translucent={true} />

      <TouchableWithoutFeedback 
        onPress={() => {
          Keyboard.dismiss();
          setFocusedInput(null);
        }}
      >
        <View style={{ flex: 1 }}>
          <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Google Info */}
        <View style={styles.header}>
          {navigation.canGoBack() ? (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
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
              style={[styles.input, focusedInput === 'fullName' && styles.inputFocused]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your Name"
              placeholderTextColor="#7F93AA"
              autoCapitalize="words"
              onFocus={() => setFocusedInput('fullName')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameContainer}>
              <TextInput
                style={[styles.input, focusedInput === 'username' && styles.inputFocused]}
                value={username}
                onChangeText={setUsername}
                placeholder="@username"
                placeholderTextColor="#7F93AA"
                autoCapitalize="none"
                onFocus={() => setFocusedInput('username')}
                onBlur={() => setFocusedInput(null)}
              />
              {username.length >= 3 && (
                <View style={styles.usernameStatus}>
                  {checkingUsername ? (
                    <ActivityIndicator size="small" color="#378BBB" />
                  ) : usernameAvailable === true ? (
                    <Text style={styles.availableText}>✓ Available</Text>
                  ) : usernameAvailable === false ? (
                    <Text style={styles.unavailableText}>✗ Taken</Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={dob ? styles.inputText : styles.placeholderText}>
                {dob ? formatDate(dob) : 'DD/MM/YYYY'}
              </Text>
            </TouchableOpacity>
          </View>

          <DatePicker
            modal
            open={showDatePicker}
            date={dob || new Date(2000, 0, 1)}
            mode="date"
            maximumDate={new Date()}
            minimumDate={new Date(1950, 0, 1)}
            onConfirm={(date) => {
              setShowDatePicker(false);
              setDob(date);
            }}
            onCancel={() => setShowDatePicker(false)}
          />

          <View>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowGenderPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={gender ? styles.inputText : styles.placeholderText}>
                {gender || 'Select Gender'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#378BBB', '#4FC3F7']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[styles.continueButton, { marginBottom: Math.max(32, insets.bottom + 16) }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {['Male', 'Female', 'Non-Binary', 'Prefer not to say'].map((g) => (
              <TouchableOpacity
                key={g}
                style={styles.genderOption}
                onPress={() => {
                  setGender(g);
                  setShowGenderPicker(false);
                }}
              >
                <Text style={styles.genderOptionText}>{g}</Text>
                {gender === g && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1621',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#B8C7D9',
    fontFamily: 'Inter_24pt-Regular',
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
  logoutButton: {
    padding: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'Inter_24pt-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#B8C7D9',
    marginBottom: 20,
    fontFamily: 'Inter_24pt-Regular',
  },
  googleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16283D',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#233B57',
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
    color: '#7F93AA',
    marginBottom: 2,
    fontFamily: 'Inter_24pt-Regular',
  },
  googleEmail: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    fontFamily: 'Inter_24pt-Bold',
  },
  form: {
    paddingHorizontal: 32,
    gap: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8C7D9',
    marginBottom: 8,
    fontFamily: 'Inter_24pt-Bold',
  },
  input: {
    backgroundColor: '#1B2F48',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
    height: 56,
    justifyContent: 'center',
    fontFamily: 'Inter_24pt-Regular',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  bioInput: {
    height: 100,
    paddingTop: 16,
  },
  inputText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter_24pt-Regular',
  },
  placeholderText: {
    fontSize: 16,
    color: '#7F93AA',
    fontFamily: 'Inter_24pt-Regular',
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
    color: '#2ECC71',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  unavailableText: {
    color: '#FF4D6D',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#16283D',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Inter_24pt-Bold',
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#233B57',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter_24pt-Regular',
  },
  checkmark: {
    fontSize: 20,
    color: '#378BBB',
    fontWeight: 'bold',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 32,
    marginTop: 24,
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default GoogleProfileSetupScreen;

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import auth, { getAuth } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface EmailVerificationScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailVerification'>;
  route: any;
}

const EmailVerificationScreen = ({ navigation, route }: EmailVerificationScreenProps) => {
  const { phoneNumber, fullName, email, username, dob, gender, password } = route.params;
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  
  const scaleAnim1 = useRef(new Animated.Value(1)).current;
  const scaleAnim2 = useRef(new Animated.Value(1)).current;
  const scaleAnim3 = useRef(new Animated.Value(1)).current;
  const flipAnim1 = useRef(new Animated.Value(0)).current;
  const flipAnim2 = useRef(new Animated.Value(0)).current;
  const flipAnim3 = useRef(new Animated.Value(0)).current;

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const checkEmailVerification = async () => {
    setChecking(true);
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Reload user to get fresh email verification status
      await user.reload();
      const updatedUser = auth().currentUser;
      
      if (updatedUser?.emailVerified) {
        setIsVerified(true);
        setChecking(false);
        return true;
      } else {
        setChecking(false);
        Toast.show({
          type: 'info',
          text1: 'Not Verified Yet',
          text2: 'Please check your email and click the verification link',
          visibilityTime: 4000,
        });
        return false;
      }
    } catch (error: any) {
      setChecking(false);
      console.error('Verification check error:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: 'Failed to check verification status',
        visibilityTime: 3000,
      });
      return false;
    }
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

  const toggleCard = (cardNumber: number) => {
    const scaleAnim = cardNumber === 1 ? scaleAnim1 : cardNumber === 2 ? scaleAnim2 : scaleAnim3;
    const flipAnim = cardNumber === 1 ? flipAnim1 : cardNumber === 2 ? flipAnim2 : flipAnim3;
    
    if (expandedCard === cardNumber) {
      // Collapse
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.timing(flipAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setExpandedCard(null);
    } else {
      // Collapse previous if any
      if (expandedCard !== null) {
        const prevScaleAnim = expandedCard === 1 ? scaleAnim1 : expandedCard === 2 ? scaleAnim2 : scaleAnim3;
        const prevFlipAnim = expandedCard === 1 ? flipAnim1 : expandedCard === 2 ? flipAnim2 : flipAnim3;
        Animated.parallel([
          Animated.spring(prevScaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
          }),
          Animated.timing(prevFlipAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
      
      // Expand new
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.timing(flipAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setExpandedCard(cardNumber);
    }
  };

  const saveUserData = async () => {
    const user = auth().currentUser;
    if (!user) throw new Error('No authenticated user');

    const accountId = user.uid;
    const age = calculateAge(dob);

    // Email/password already linked in ProfileSetupScreen, no need to link again

    // Update account document with email verified and signupStep
    await firestore().collection('accounts').doc(accountId).set({
      authUid: user.uid,
      role: 'user',
      creatorType: null,
      status: 'active',
      phoneVerified: true,
      emailVerified: user.emailVerified, // From Firebase Auth
      identityVerified: false,
      bankVerified: false,
      signupStep: 'photos', // Next step is photo upload
      createdAt: firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Create user document (following schema exactly)
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
      photos: [],
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
      createdAt: firestore.FieldValue.serverTimestamp(),
      lastActiveAt: firestore.FieldValue.serverTimestamp(),
    });
  };

  const handleVerify = async () => {
    setLoading(true);
    
    try {
      // Check if email is verified
      const verified = await checkEmailVerification();
      
      if (!verified) {
        setLoading(false);
        return;
      }
      
      // Save user data to Firestore
      await saveUserData();
      
      setLoading(false);
      Toast.show({
        type: 'success',
        text1: 'Email Verified!',
        text2: 'Your account is ready',
        visibilityTime: 3000,
      });
      
      setTimeout(() => {
        navigation.navigate('PhotoUpload');
      }, 1000);
    } catch (error: any) {
      setLoading(false);
      console.error('Email verification error:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'An error occurred. Please try again',
        visibilityTime: 4000,
      });
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      await user.sendEmailVerification();
      
      // Reset timer
      setResendTimer(30);
      setCanResend(false);
      
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: 'A new verification email has been sent',
        visibilityTime: 3000,
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: error.message || 'Failed to resend verification email',
        visibilityTime: 3000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to {email}
        </Text>

        <View style={styles.instructionsRow}>
          {/* Card 1 */}
          <Pressable onPress={() => toggleCard(1)} style={{ flex: 1 }}>
            <Animated.View
              style={[
                styles.instructionCard,
                {
                  transform: [
                    { perspective: 1000 },
                    { scale: scaleAnim1 },
                    {
                      rotateY: flipAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {expandedCard === 1 ? (
                <View style={[styles.cardContent, { transform: [{ rotateY: '180deg' }] }]}>
                  <Text style={styles.cardBackText}>Check Inbox{"\n"}or Spam</Text>
                </View>
              ) : (
                <View style={styles.cardContent}>
                  <Text style={styles.instructionNumber}>1</Text>
                  <Text style={styles.instructionText}>Step 1</Text>
                </View>
              )}
            </Animated.View>
          </Pressable>

          {/* Card 2 */}
          <Pressable onPress={() => toggleCard(2)} style={{ flex: 1 }}>
            <Animated.View
              style={[
                styles.instructionCard,
                {
                  transform: [
                    { perspective: 1000 },
                    { scale: scaleAnim2 },
                    {
                      rotateY: flipAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {expandedCard === 2 ? (
                <View style={[styles.cardContent, { transform: [{ rotateY: '180deg' }] }]}>
                  <Text style={styles.cardBackText}>Click{"\n"}Verification Link</Text>
                </View>
              ) : (
                <View style={styles.cardContent}>
                  <Text style={styles.instructionNumber}>2</Text>
                  <Text style={styles.instructionText}>Step 2</Text>
                </View>
              )}
            </Animated.View>
          </Pressable>

          {/* Card 3 */}
          <Pressable onPress={() => toggleCard(3)} style={{ flex: 1 }}>
            <Animated.View
              style={[
                styles.instructionCard,
                {
                  transform: [
                    { perspective: 1000 },
                    { scale: scaleAnim3 },
                    {
                      rotateY: flipAnim3.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {expandedCard === 3 ? (
                <View style={[styles.cardContent, { transform: [{ rotateY: '180deg' }] }]}>
                  <Text style={styles.cardBackText}>Tap I've Verified{"\n"}to Continue</Text>
                </View>
              ) : (
                <View style={styles.cardContent}>
                  <Text style={styles.instructionNumber}>3</Text>
                  <Text style={styles.instructionText}>Step 3</Text>
                </View>
              )}
            </Animated.View>
          </Pressable>
        </View>

        {isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Email Verified!</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.checkButton}
          onPress={checkEmailVerification}
          disabled={checking}
          activeOpacity={0.8}
        >
          {checking ? (
            <ActivityIndicator color="#378BBB" />
          ) : (
            <Text style={styles.checkButtonText}>Check Verification Status</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleVerify}
          disabled={!isVerified || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={!isVerified || loading ? ['#1B2F48', '#1B2F48'] : ['#378BBB', '#4FC3F7']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.verifyButton}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>I've Verified - Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive email? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResendCode} activeOpacity={0.7}>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1621',
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
    paddingHorizontal: 32,
    paddingTop: 40,
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
    marginBottom: 40,
    fontFamily: 'Inter_24pt-Regular',
  },
  instructionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  instructionCard: {
    backgroundColor: '#16283D',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#233B57',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackText: {
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Inter_24pt-Bold',
  },
  instructionNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#378BBB',
    marginBottom: 4,
    fontFamily: 'Inter_24pt-Bold',
  },
  instructionText: {
    fontSize: 11,
    color: '#B8C7D9',
    textAlign: 'center',
    fontFamily: 'Inter_24pt-Regular',
  },
  verifiedBadge: {
    backgroundColor: '#1F3B2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  verifiedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2ECC71',
    fontFamily: 'Inter_24pt-Bold',
  },
  checkButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#378BBB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkButtonText: {
    color: '#378BBB',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  verifyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#B8C7D9',
    fontFamily: 'Inter_24pt-Regular',
  },
  resendLink: {
    fontSize: 15,
    color: '#378BBB',
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  resendTimer: {
    fontSize: 15,
    color: '#7F93AA',
    fontWeight: '500',
    fontFamily: 'Inter_24pt-Regular',
  },
});

export default EmailVerificationScreen;

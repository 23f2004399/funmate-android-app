import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import auth, { getAuth, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface OTPVerificationScreenProps {
  navigation: any;
  route: any;
}

const OTPVerificationScreen = ({ navigation, route }: OTPVerificationScreenProps) => {
  const { phoneNumber, verificationId, accountType = 'user', isLogin = false } = route.params as {
    phoneNumber: string;
    verificationId: string;
    accountType?: 'user' | 'creator';
    isLogin?: boolean;
  };
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Bubble animations
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble6Y = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    const createBubbleAnimation = (animatedValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: -30,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      createBubbleAnimation(bubble1Y, 4000),
      createBubbleAnimation(bubble2Y, 3500),
      createBubbleAnimation(bubble3Y, 4500),
      createBubbleAnimation(bubble4Y, 3800),
      createBubbleAnimation(bubble5Y, 4200),
      createBubbleAnimation(bubble6Y, 4600),
    ];

    animations.forEach(anim => anim.start());
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Incomplete Code',
        text2: 'Please enter the complete 6-digit code',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('Verifying OTP:', otpCode);
      
      // Use modular API to create credential and sign in
      const credential = PhoneAuthProvider.credential(verificationId, otpCode);
      const authInstance = getAuth();
      const userCredential = await signInWithCredential(authInstance, credential);
      
      const userId = userCredential.user.uid;
      console.log('Phone verified! User ID:', userId);
      
      // Check if this user already has an account (duplicate signup attempt)
      let isExistingUser = false;
      
      try {
        const accountDoc = await firestore()
          .collection('accounts')
          .doc(userId)
          .get();
        
        console.log('Account doc data:', accountDoc.data());
        console.log('Account exists?:', accountDoc.exists);
        
        // Only treat as existing if document actually has data
        isExistingUser = accountDoc.exists && accountDoc.data() !== undefined;
        console.log('Is existing user?:', isExistingUser);
        
      } catch (firestoreError: any) {
        // If Firestore check fails, assume new user
        console.log('Firestore check error (treating as new user):', firestoreError.code, firestoreError.message);
        isExistingUser = false;
      }
      
      // Handle LOGIN flow
      if (isLogin) {
        if (!isExistingUser) {
          // User doesn't exist - can't login
          await auth().signOut();
          setLoading(false);
          Toast.show({
            type: 'error',
            text1: 'Account Not Found',
            text2: 'No account found with this phone number. Please sign up first.',
            visibilityTime: 4000,
          });
          navigation.navigate('Login');
          return;
        }
        
        // Login successful
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
        return;
      }
      
      // Handle SIGNUP flow
      if (isExistingUser) {
        // User already has account - check their signup progress
        const accountData = (await firestore().collection('accounts').doc(userId).get()).data();
        const signupStep = accountData?.signupStep;
        
        if (signupStep && signupStep !== 'complete') {
          // User has incomplete signup - let them continue
          setLoading(false);
          Toast.show({
            type: 'info',
            text1: 'Welcome Back!',
            text2: 'Let\'s continue setting up your profile',
            visibilityTime: 2000,
          });
          
          // Navigate based on signupStep
          const screenMap: Record<string, string> = {
            'basic_info': 'ProfileSetup',
            'photos': 'PhotoUpload',
            'liveness': 'LivenessVerification',
            'preferences': 'DatingPreferences',
            'interests': 'InterestsSelection',
            'permissions': 'Permissions',
          };
          
          const targetScreen = screenMap[signupStep] || 'ProfileSetup';
          navigation.navigate(targetScreen as never, accountType === 'creator' ? undefined : { phoneNumber });
          return;
        }
        
        // Signup is complete - this is a duplicate signup attempt
        await auth().signOut();
        setLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Phone Number Already Registered',
          text2: 'This phone number is already linked to an account. Please log in.',
          visibilityTime: 4000,
        });
        navigation.goBack();
        return;
      }
      
      // NEW USER: Create account document with signupStep
      try {
        await firestore().collection('accounts').doc(userId).set({
          authUid: userId,
          // Phone number NOT stored here - available via auth().currentUser.phoneNumber
          role: accountType === 'creator' ? 'event_creator' : 'user',
          creatorType: null,
          status: 'pending_verification',
          phoneVerified: true,
          emailVerified: false,
          identityVerified: false,
          bankVerified: false,
          signupStep: 'basic_info',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        console.log('Account document created with signupStep: basic_info');
      } catch (createError) {
        console.error('Error creating account document:', createError);
        // Continue anyway - the signup screens will handle this
      }
      
      setLoading(false);
      
      Toast.show({
        type: 'success',
        text1: 'Phone Verified!',
        text2: accountType === 'creator' ? 'Complete your profile' : 'Let\'s set up your profile',
        visibilityTime: 2000,
      });
      
      if (accountType === 'creator') {
        console.log('New creator - navigating to CreatorBasicInfo');
        // Navigate to creator basic info (Full Name, Email, Username, Password)
        navigation.navigate('CreatorBasicInfo', { phoneNumber });
      } else {
        console.log('New user - navigating to ProfileSetup');
        // Navigate to profile setup
        navigation.navigate('ProfileSetup', { phoneNumber });
      }
    } catch (error: any) {
      setLoading(false);
      console.error('OTP verification error:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'Invalid code. Please try again',
        visibilityTime: 4000,
      });
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    try {
      console.log('Resending code to:', phoneNumber);
      
      const authInstance = getAuth();
      const newConfirmation = await signInWithPhoneNumber(
        authInstance,
        phoneNumber
      );
      
      // Reset timer
      setResendTimer(30);
      setCanResend(false);
      
      Toast.show({
        type: 'success',
        text1: 'Code Sent',
        text2: 'A new verification code has been sent',
        visibilityTime: 3000,
      });
      
      // Update verificationId in route params
      navigation.setParams({ verificationId: newConfirmation.verificationId });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Resend Failed',
        text2: error.message || 'Failed to resend code',
        visibilityTime: 3000,
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
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a code to {phoneNumber}
        </Text>

        {/* OTP Input Boxes */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpBox,
                digit && styles.otpBoxFilled,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          onPress={handleVerify}
          disabled={otp.join('').length !== 6 || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={otp.join('').length !== 6 ? ['#1B2F48', '#1B2F48'] : ['#378BBB', '#4FC3F7']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.verifyButton}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify & Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Resend Code */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive code? </Text>
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpBox: {
    width: 50,
    height: 56,
    backgroundColor: '#1B2F48',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1B2F48',
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Inter_24pt-Bold',
  },
  otpBoxFilled: {
    borderColor: '#378BBB',
    backgroundColor: '#1B2F48',
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
  bubble: {
    position: 'absolute',
    backgroundColor: '#378BBB',
    opacity: 0.08,
    borderRadius: 100,
  },
  bubble1: {
    width: 110,
    height: 110,
    top: '10%',
    left: '8%',
  },
  bubble2: {
    width: 75,
    height: 75,
    top: '22%',
    right: '12%',
  },
  bubble3: {
    width: 95,
    height: 95,
    top: '50%',
    left: '7%',
  },
  bubble4: {
    width: 65,
    height: 65,
    top: '65%',
    right: '10%',
  },
  bubble5: {
    width: 85,
    height: 85,
    top: '78%',
    left: '15%',
  },
  bubble6: {
    width: 70,
    height: 70,
    top: '85%',
    right: '20%',
  },
});

export default OTPVerificationScreen;

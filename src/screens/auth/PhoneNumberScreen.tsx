import React, { useState, useEffect, useRef } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import auth, { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface PhoneNumberScreenProps {
  navigation: any;
  route: any;
}

const PhoneNumberScreen = ({ navigation, route }: PhoneNumberScreenProps) => {
  const insets = useSafeAreaInsets();
  const { accountType = 'user', isLogin = false } = route.params || {};
  const [countryCode, setCountryCode] = useState<CountryCode>('IN');
  const [callingCode, setCallingCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Bubble animations
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble6Y = useRef(new Animated.Value(0)).current;

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

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(`+${country.callingCode[0]}`);
  };

  const handleContinue = async () => {
    if (phoneNumber.length < 10) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Phone Number',
        text2: 'Please enter a valid phone number',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);
    
    try {
      const fullPhoneNumber = callingCode + phoneNumber;
      console.log('Sending OTP to:', fullPhoneNumber);
      
      // Send OTP directly (Firebase Auth handles phone internally, no DB storage)
      const authInstance = getAuth();
      const confirmation = await signInWithPhoneNumber(
        authInstance,
        fullPhoneNumber
      );
      
      console.log('OTP sent successfully');
      setLoading(false);
      
      // Pass only verificationId to avoid navigation serialization warnings
      navigation.navigate('OTPVerification', {
        phoneNumber: fullPhoneNumber,
        verificationId: confirmation.verificationId,
        accountType,
        isLogin,
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Phone auth error:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'Failed to send verification code',
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
        <Text style={styles.title}>Enter Your Phone Number</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code
        </Text>

        {/* Phone Input */}
        <View style={styles.phoneInputContainer}>
          <TouchableOpacity
            style={styles.countryCodeContainer}
            onPress={() => setShowCountryPicker(true)}
            activeOpacity={0.7}
          >
            <CountryPicker
              countryCode={countryCode}
              withFilter
              withFlag
              withCallingCode
              withEmoji
              onSelect={onSelectCountry}
              visible={showCountryPicker}
              onClose={() => setShowCountryPicker(false)}
              theme={{
                backgroundColor: '#16283D',
                onBackgroundTextColor: '#FFFFFF',
                fontSize: 16,
                filterPlaceholderTextColor: '#7F93AA',
                activeOpacity: 0.7,
                itemHeight: 50,
              }}
              modalProps={{
                animationType: 'slide',
              }}
              containerButtonStyle={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
            <Text style={styles.countryCodeText}>{callingCode}</Text>
          </TouchableOpacity>
          
          <View style={styles.phoneNumberContainer}>
            <TextInput
              style={styles.phoneNumberInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone Number"
              placeholderTextColor="#999999"
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
            />
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={phoneNumber.length < 10 || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={phoneNumber.length < 10 ? ['#1B2F48', '#1B2F48'] : ['#378BBB', '#4FC3F7']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[styles.continueButton, { marginBottom: Math.max(32, insets.bottom + 16) }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Get Code</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    alignItems: 'stretch',
  },
  countryCodeContainer: {
    width: 100,
    backgroundColor: '#1B2F48',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Inter_24pt-Bold',
  },
  phoneNumberContainer: {
    flex: 1,
  },
  phoneNumberInput: {
    backgroundColor: '#1B2F48',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
    height: 56,
    fontFamily: 'Inter_24pt-Regular',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  bubble: {
    position: 'absolute',
    backgroundColor: '#378BBB',
    opacity: 0.08,
    borderRadius: 100,
  },
  bubble1: {
    width: 120,
    height: 120,
    top: '8%',
    left: '10%',
  },
  bubble2: {
    width: 80,
    height: 80,
    top: '25%',
    right: '15%',
  },
  bubble3: {
    width: 100,
    height: 100,
    top: '45%',
    left: '5%',
  },
  bubble4: {
    width: 60,
    height: 60,
    top: '60%',
    right: '8%',
  },
  bubble5: {
    width: 90,
    height: 90,
    top: '75%',
    left: '20%',
  },
  bubble6: {
    width: 70,
    height: 70,
    top: '88%',
    right: '25%',
  },
});

export default PhoneNumberScreen;

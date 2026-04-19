/**
 * INDIVIDUAL HOST VERIFICATION SCREEN
 * 
 * Identity verification for individual event hosts using:
 * - Aadhaar (preferred)
 * - PAN (alternative or additional)
 * 
 * Verification Provider: Digio (https://www.digio.in/)
 * 
 * Database Updates:
 * - Creates verifications/{verificationId} with type "aadhaar_basic" or "pan_basic"
 * - Stores only verification status, NOT raw document numbers
 * - Updates accounts/{accountId}.identityVerified to true on approval
 * 
 * Next: IndividualBankDetailsScreen
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

/**
 * Animated input component - uses Animated API for glow effect
 * Animated values change UI without React re-renders, so focus is stable
 */
interface GlowInputProps extends TextInputProps {
  iconName: string;
}

const GlowInput = ({ iconName, style, ...inputProps }: GlowInputProps) => {
  // Animated value - changes don't trigger re-renders
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
    inputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    inputProps.onBlur?.(e);
  };

  // Interpolate border color from default to glow
  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(139, 92, 246, 0.30)', 'rgba(139, 92, 246, 0.80)'],
  });

  return (
    <Animated.View style={[styles.inputContainer, { borderColor }]}>
      <Ionicons
        name={iconName}
        size={20}
        color="rgba(255, 255, 255, 0.55)"
        style={styles.inputIcon}
      />
      <TextInput
        {...inputProps}
        style={[styles.input, style]}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Animated.View>
  );
};

interface IndividualVerificationScreenProps {
  navigation: any;
}

const IndividualVerificationScreen: React.FC<IndividualVerificationScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Store canGoBack result once to avoid re-renders
  const canGoBack = useRef(navigation.canGoBack()).current;

  /**
   * Validate Aadhaar format (12 digits)
   */
  const validateAadhaar = (aadhaar: string): boolean => {
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(aadhaar);
  };

  /**
   * Validate PAN format (ABCDE1234F)
   */
  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  /**
   * ═══════════════════════════════════════════════════════════════════
   * � DIGIO API INTEGRATION POINT
   * ═══════════════════════════════════════════════════════════════════
   * 
   * CURRENT STATUS: BYPASS MODE (No actual verification)
   * Users can proceed without real identity verification for development.
   * 
   * WHEN READY TO INTEGRATE DIGIO:
   * 
   * 1. BACKEND SETUP (Required - Never call Digio directly from frontend):
   *    a) Create Cloud Function or Express endpoint:
   *       - Firebase: functions/src/verifyIdentity.ts
   *       - Express: routes/api/verify-identity.js
   *    
   *    b) Store Digio API credentials in environment variables:
   *       - DIGIO_API_KEY
   *       - DIGIO_CLIENT_ID
   *       - DIGIO_BASE_URL (https://api.digio.in/v2/)
   * 
   * 2. VERIFICATION FLOW:
   *    
   *    AADHAAR VERIFICATION:
   *    - Step 1: POST /aadhaar/otp - Send Aadhaar number → Digio sends OTP
   *    - Step 2: Show OTP input screen to user
   *    - Step 3: POST /aadhaar/verify - Send Aadhaar + OTP → Get verification result
   *    - Returns: { name, aadhaarLast4, verified: true/false }
   *    
   *    PAN VERIFICATION:
   *    - Step 1: POST /pan/verify - Send PAN number → Instant verification
   *    - Returns: { name, panNumber, verified: true/false }
   * 
   * 3. FIRESTORE UPDATES (Backend should handle):
   *    
   *    Create verification record:
   *    verifications/{verificationId} = {
   *      accountId: user.uid,
   *      type: "aadhaar_basic" | "pan_basic",
   *      provider: "Digio",
   *      status: "approved" | "rejected" | "pending",
   *      verifiedName: string,           // Name from Digio
   *      meta: { last4: "1234" },        // Last 4 digits only (for Aadhaar)
   *      reason: string | null,          // Rejection reason if any
   *      verifiedAt: serverTimestamp(),
   *      createdAt: serverTimestamp()
   *    }
   *    
   *    Update account status:
   *    accounts/{accountId}.identityVerified = true (only if approved)
   * 
   * 4. REPLACE THE CODE BELOW:
   *    
   *    Uncomment the actual implementation section and:
   *    - Replace 'YOUR_BACKEND_URL' with your Cloud Function URL or API endpoint
   *    - Handle OTP flow for Aadhaar (may need additional screen)
   *    - Parse response and check verification status
   *    - Return { success: true, verificationId: '...' } on approval
   * 
   * ═══════════════════════════════════════════════════════════════════
   */
  const verifyWithDigio = async (type: 'aadhaar' | 'pan', documentNumber: string) => {
    // 🚧 BYPASS MODE - Remove this section when Digio is integrated
    console.log(`[BYPASS] Skipping ${type} verification for: ${documentNumber}`);
    return { success: true, bypass: true };

    /*
    // ✅ REAL IMPLEMENTATION - Uncomment when Digio backend is ready:
    
    try {
      const user = auth().currentUser;
      if (!user) throw new Error('No authenticated user');

      // Call your backend endpoint (Cloud Function or API server)
      const response = await fetch('YOUR_BACKEND_URL/api/verify-identity', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}` // Firebase auth token
        },
        body: JSON.stringify({
          accountId: user.uid,
          type: type,                    // 'aadhaar' or 'pan'
          documentNumber: documentNumber, // Aadhaar (12 digits) or PAN (ABCDE1234F)
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Verification failed');
      }

      // Expected response from backend:
      // {
      //   success: true,
      //   verificationId: 'xxx',
      //   status: 'approved' | 'rejected' | 'pending',
      //   verifiedName: 'John Doe',  // From Digio
      //   message: string
      // }
      
      if (result.status !== 'approved') {
        throw new Error(result.message || 'Verification not approved');
      }

      return result;
      
    } catch (error) {
      console.error('Digio verification error:', error);
      throw error;
    }
    */
  };

  /**
   * Handle verification submission
   */
  const handleVerify = async () => {
    try {
      // Validation: Both documents required
      if (!aadhaarNumber || !panNumber) {
        Toast.show({
          type: 'error',
          text1: 'Both Documents Required',
          text2: 'Please enter both Aadhaar and PAN number',
          visibilityTime: 3000,
        });
        return;
      }

      // Validate Aadhaar if provided
      if (aadhaarNumber && !validateAadhaar(aadhaarNumber)) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Aadhaar',
          text2: 'Aadhaar must be 12 digits',
          visibilityTime: 3000,
        });
        return;
      }

      // Validate PAN if provided
      if (panNumber && !validatePAN(panNumber)) {
        Toast.show({
          type: 'error',
          text1: 'Invalid PAN',
          text2: 'PAN format should be ABCDE1234F',
          visibilityTime: 3000,
        });
        return;
      }

      setLoading(true);

      // Verify Aadhaar if provided
      if (aadhaarNumber) {
        await verifyWithDigio('aadhaar', aadhaarNumber);
      }

      // Verify PAN if provided
      if (panNumber) {
        await verifyWithDigio('pan', panNumber);
      }

      setLoading(false);

      // Update signup step before navigating
      const user = auth().currentUser;
      if (user) {
        await firestore()
          .collection('accounts')
          .doc(user.uid)
          .update({
            signupStep: 'individual_bank_details',
          });
      }

      // If verification succeeds, navigate to bank details
      Toast.show({
        type: 'success',
        text1: 'Verification Complete',
        text2: 'Your identity has been verified',
        visibilityTime: 3000,
      });

      setTimeout(() => {
        navigation.navigate('IndividualBankDetails');
      }, 1000);

    } catch (error: any) {
      setLoading(false);
      console.error('Verification error:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: error.message || 'Unable to verify identity',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/bg_party.webp')}
      style={styles.container}
      resizeMode="cover"
      blurRadius={6}
    >
      <View style={styles.overlay}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
        />

        {canGoBack && (
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: canGoBack ? insets.top + 54 : 0,
              paddingBottom: Math.max(32, insets.bottom + 20),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20}
        >

          <View
            style={[
              styles.content,
              !canGoBack && { paddingTop: insets.top + 32 },
            ]}
          >
            <Text style={styles.title}>Verify Your Identity</Text>
            <Text style={styles.subtitle}>
              Required for hosting events and receiving payouts
            </Text>

            <View style={styles.infoBanner}>
              <Ionicons name="shield-checkmark" size={22} color="#A855F7" />
              <View style={styles.infoBannerText}>
                <Text style={styles.infoBannerTitle}>Secure Verification</Text>
                <Text style={styles.infoBannerSubtitle}>
                  We use Digio for secure identity verification. Your documents are never stored.
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Aadhaar Number <Text style={styles.optional}>(Required)</Text>
              </Text>
              <GlowInput
                iconName="card"
                value={aadhaarNumber}
                onChangeText={(text) => setAadhaarNumber(text.replace(/\D/g, ''))}
                placeholder="Enter 12-digit Aadhaar"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="numeric"
                maxLength={12}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {aadhaarNumber.length > 0 && !validateAadhaar(aadhaarNumber) && (
                <Text style={styles.errorText}>Aadhaar must be 12 digits</Text>
              )}
            </View>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>and</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                PAN Card <Text style={styles.optional}>(Required)</Text>
              </Text>
              <GlowInput
                iconName="card-outline"
                value={panNumber}
                onChangeText={(text) => setPanNumber(text.toUpperCase())}
                placeholder="Enter PAN (ABCDE1234F)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                maxLength={10}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {panNumber.length > 0 && !validatePAN(panNumber) && (
                <Text style={styles.errorText}>PAN format: ABCDE1234F</Text>
              )}
            </View>

            <View style={styles.helpBox}>
              <Ionicons name="information-circle" size={20} color="#06B6D4" />
              <Text style={styles.helpText}>
                Please provide both Aadhaar and PAN to continue.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleVerify}
              disabled={(!aadhaarNumber || !panNumber) || loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  (!aadhaarNumber || !panNumber) || loading
                    ? ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.14)']
                    : ['#8B2BE2', '#06B6D4']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyButton}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Identity</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0B1E',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.60)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  title: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#1A1530',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  infoBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
  },
  optional: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(66, 66, 66, 0.7)',
    borderColor: 'rgba(53, 53, 53, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    opacity: 0.8,
    elevation: 4,
  },
  inputContainerFocused: {
    borderColor: 'rgba(255,255,255,0.38)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B81',
    marginTop: 6,
    marginLeft: 4,
    fontFamily: 'Inter-Regular',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  orText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.40)',
    marginHorizontal: 14,
    fontFamily: 'Inter-Regular',
  },
  helpBox: {
    flexDirection: 'row',
    backgroundColor: '#1A1530',
    borderRadius: 16,
    padding: 14,
    marginBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    marginLeft: 10,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  verifyButton: {
    height: 54,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
});

export default IndividualVerificationScreen;

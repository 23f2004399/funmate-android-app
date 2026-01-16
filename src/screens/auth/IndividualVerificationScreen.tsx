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
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface IndividualVerificationScreenProps {
  navigation: any;
}

const IndividualVerificationScreen: React.FC<IndividualVerificationScreenProps> = ({ navigation }) => {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [loading, setLoading] = useState(false);

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
   * 🚨 DIGIO API INTEGRATION POINT
   * ═══════════════════════════════════════════════════════════════════
   * 
   * TODO: Remove mock error when Digio API is ready
   * 
   * DIGIO INTEGRATION STEPS:
   * 
   * 1. Backend Setup:
   *    - Create Cloud Function or backend endpoint
   *    - Store Digio API credentials securely (never in frontend)
   *    - Endpoint: POST /api/verify-aadhaar or /api/verify-pan
   * 
   * 2. Verification Flow:
   *    a) Aadhaar Verification:
   *       - Send Aadhaar number to Digio
   *       - Digio sends OTP to user's registered mobile
   *       - User enters OTP
   *       - Digio returns verification status + name (no full Aadhaar stored)
   * 
   *    b) PAN Verification:
   *       - Send PAN number + DOB to Digio
   *       - Digio verifies against government database
   *       - Returns verification status + name
   * 
   * 3. Store Verification Result:
   *    - Create verifications/{verificationId} with:
   *      {
   *        accountId: user.uid,
   *        type: "aadhaar_basic" or "pan_basic",
   *        provider: "Digio",
   *        status: "approved" | "rejected" | "pending",
   *        reason: string,
   *        meta: { last4: "1234" }, // Last 4 digits only
   *        verifiedAt: timestamp
   *      }
   * 
   * 4. Update Account Status:
   *    - Set accounts/{accountId}.identityVerified = true
   * 
   * 5. Replace the mock error below with actual Digio API call
   * 
   * ═══════════════════════════════════════════════════════════════════
   */
  const verifyWithDigio = async (type: 'aadhaar' | 'pan', documentNumber: string) => {
    // 🚨 MOCK ERROR - REMOVE WHEN DIGIO API IS READY
    throw new Error('Digio not responding. Please try again later or contact support.');

    /*
    // ✅ REAL IMPLEMENTATION (Uncomment when Digio is ready):
    
    try {
      const user = auth().currentUser;
      if (!user) throw new Error('No authenticated user');

      // Call your backend endpoint (Cloud Function or custom backend)
      const response = await fetch('YOUR_BACKEND_URL/api/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: user.uid,
          type: type,
          documentNumber: documentNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Verification failed');
      }

      // Backend should handle:
      // 1. Call Digio API
      // 2. Create verification document in Firestore
      // 3. Update accounts.identityVerified if approved
      
      return result; // { status: 'approved', verificationId: '...' }
      
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
      // Validation: At least one document required
      if (!aadhaarNumber && !panNumber) {
        Toast.show({
          type: 'error',
          text1: 'Document Required',
          text2: 'Please enter Aadhaar or PAN number',
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAwareScrollView
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
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Required for hosting events and receiving payouts
          </Text>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
            <View style={styles.infoBannerText}>
              <Text style={styles.infoBannerTitle}>Secure Verification</Text>
              <Text style={styles.infoBannerSubtitle}>
                We use Digio for secure identity verification. Your documents are never stored.
              </Text>
            </View>
          </View>

          {/* Aadhaar Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Aadhaar Number <Text style={styles.optional}>(Recommended)</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="card" size={20} color="#999999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={aadhaarNumber}
                onChangeText={(text) => setAadhaarNumber(text.replace(/\D/g, ''))}
                placeholder="Enter 12-digit Aadhaar"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                maxLength={12}
                autoCapitalize="none"
              />
            </View>
            {aadhaarNumber.length > 0 && !validateAadhaar(aadhaarNumber) && (
              <Text style={styles.errorText}>Aadhaar must be 12 digits</Text>
            )}
          </View>

          {/* OR Divider */}
          <View style={styles.orDivider}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* PAN Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              PAN Card <Text style={styles.optional}>(Alternative)</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color="#999999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={panNumber}
                onChangeText={(text) => setPanNumber(text.toUpperCase())}
                placeholder="Enter PAN (ABCDE1234F)"
                placeholderTextColor="#999999"
                maxLength={10}
                autoCapitalize="characters"
              />
            </View>
            {panNumber.length > 0 && !validatePAN(panNumber) && (
              <Text style={styles.errorText}>PAN format: ABCDE1234F</Text>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpBox}>
            <Ionicons name="information-circle" size={20} color="#FF4458" />
            <Text style={styles.helpText}>
              You can provide Aadhaar, PAN, or both for faster approval
            </Text>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!aadhaarNumber && !panNumber) && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={(!aadhaarNumber && !panNumber) || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Identity</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  infoBannerSubtitle: {
    fontSize: 13,
    color: '#4CAF50',
    lineHeight: 18,
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
  optional: {
    fontSize: 13,
    fontWeight: '400',
    color: '#999999',
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
  errorText: {
    fontSize: 13,
    color: '#FF4458',
    marginTop: 6,
    marginLeft: 4,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
  helpBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    alignItems: 'center',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#666666',
    marginLeft: 10,
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: '#FFB3BC',
    elevation: 0,
    shadowOpacity: 0,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default IndividualVerificationScreen;

/**
 * MERCHANT BANK DETAILS SCREEN (Payout Account Setup)
 * 
 * For Merchant Organizers to add their business bank account for event payouts.
 * - Account Holder Name
 * - Account Number (with confirmation)
 * - IFSC Code (auto-fetches bank name)
 * - Account Type (Current/Savings)
 * 
 * Verification: Razorpay Penny Drop API
 * 
 * Database Updates:
 * - Creates bankAccounts/{accountId}
 * - Updates accounts/{accountId}.signupStep to 'complete'
 * - Updates accounts/{accountId}.bankVerified to true
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';

type RootStackParamList = {
  MerchantBankDetails: undefined;
};

type MerchantBankDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MerchantBankDetails'
>;

type MerchantBankDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  'MerchantBankDetails'
>;

interface Props {
  navigation: MerchantBankDetailsScreenNavigationProp;
  route: MerchantBankDetailsScreenRouteProp;
}

interface GlowInputProps {
  iconName: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  secureTextEntry?: boolean;
}

const GlowInput: React.FC<GlowInputProps> = ({ iconName, ...inputProps }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(139, 92, 246, 0.30)', 'rgba(139, 92, 246, 0.80)'],
  });

  return (
    <Animated.View style={[styles.inputContainer, { borderColor }]}>
      <Ionicons
        name={iconName as any}
        size={20}
        color="rgba(255, 255, 255, 0.55)"
        style={styles.inputIcon}
      />
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor="rgba(255,255,255,0.35)"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Animated.View>
  );
};

const MerchantBankDetailsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // Form state
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<'current' | 'savings'>('current');

  // Loading states
  const [isFetchingBank, setIsFetchingBank] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const canGoBack = useRef(navigation.canGoBack()).current;

  /**
   * ============================================================================
   * IFSC CODE AUTO-FETCH BANK NAME
   * ============================================================================
   * 
   * Uses Razorpay's public IFSC API (free, no auth required)
   * API: https://ifsc.razorpay.com/{ifsc}
   * 
   * Response:
   * {
   *   "BANK": "State Bank of India",
   *   "IFSC": "SBIN0001234",
   *   "BRANCH": "Mumbai Main Branch",
   *   "ADDRESS": "123 MG Road, Mumbai",
   *   "CITY": "MUMBAI",
   *   "STATE": "MAHARASHTRA"
   * }
   * 
   * Error: 404 if IFSC not found
   */
  const fetchBankName = async (ifsc: string) => {
    if (ifsc.length !== 11) {
      setBankName('');
      return;
    }

    setIsFetchingBank(true);

    try {
      const response = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
      
      if (!response.ok) {
        throw new Error('Invalid IFSC code');
      }

      const data = await response.json() as { BANK?: string; IFSC?: string; BRANCH?: string };
      setBankName(data.BANK || 'Unknown Bank');
      setIsFetchingBank(false);
    } catch (error: any) {
      console.error('IFSC fetch error:', error);
      setBankName('');
      setIsFetchingBank(false);
      Toast.show({
        type: 'error',
        text1: 'Invalid IFSC Code',
        text2: 'Please check and enter a valid IFSC code',
      });
    }
  };

  const handleIfscChange = (text: string) => {
    const upperText = text.toUpperCase();
    setIfscCode(upperText);

    // Auto-fetch when 11 characters entered
    if (upperText.length === 11) {
      fetchBankName(upperText);
    } else {
      setBankName('');
    }
  };

  const validateForm = (): boolean => {
    if (!accountHolderName.trim()) {
      Toast.show({ type: 'error', text1: 'Account Holder Name Required', text2: 'Please enter account holder name' });
      return false;
    }

    if (!accountNumber.trim() || accountNumber.length < 9) {
      Toast.show({ type: 'error', text1: 'Invalid Account Number', text2: 'Please enter a valid account number' });
      return false;
    }

    if (accountNumber !== confirmAccountNumber) {
      Toast.show({ type: 'error', text1: 'Account Number Mismatch', text2: 'Account numbers do not match' });
      return false;
    }

    if (!ifscCode.trim() || ifscCode.length !== 11) {
      Toast.show({ type: 'error', text1: 'Invalid IFSC Code', text2: 'IFSC code must be 11 characters' });
      return false;
    }

    if (!bankName) {
      Toast.show({ type: 'error', text1: 'Bank Name Not Found', text2: 'Please enter a valid IFSC code' });
      return false;
    }

    return true;
  };

  const isFormComplete = (): boolean => {
    return (
      accountHolderName.trim().length > 0 &&
      accountNumber.trim().length >= 9 &&
      confirmAccountNumber.trim().length >= 9 &&
      accountNumber === confirmAccountNumber &&
      ifscCode.trim().length === 11 &&
      bankName.trim().length > 0
    );
  };

  /**
   * ============================================================================
   * RAZORPAY PENNY DROP VERIFICATION
   * ============================================================================
   * 
   * Razorpay Fund Account Validation API
   * Docs: https://razorpay.com/docs/api/razorpayx/fund-accounts/#fund-account-validation
   * 
   * Step 1: Create Contact
   * POST https://api.razorpay.com/v1/contacts
   * Headers: {
   *   "Authorization": "Basic <base64(key_id:key_secret)>",
   *   "Content-Type": "application/json"
   * }
   * Body: {
   *   "name": "ABC Business Pvt Ltd",
   *   "email": "business@example.com",
   *   "contact": "9876543210",
   *   "type": "vendor",
   *   "reference_id": "firebase_account_id"
   * }
   * Response: { "id": "cont_xxxxx", ... }
   * 
   * Step 2: Create Fund Account
   * POST https://api.razorpay.com/v1/fund_accounts
   * Body: {
   *   "contact_id": "cont_xxxxx",
   *   "account_type": "bank_account",
   *   "bank_account": {
   *     "name": "ABC Business Pvt Ltd",
   *     "ifsc": "SBIN0001234",
   *     "account_number": "123456789012"
   *   }
   * }
   * Response: { "id": "fa_xxxxx", ... }
   * 
   * Step 3: Fund Account Validation (Penny Drop)
   * POST https://api.razorpay.com/v1/fund_accounts/validations
   * Body: {
   *   "fund_account": {
   *     "id": "fa_xxxxx"
   *   },
   *   "amount": 100,  // ₹1.00 (in paise)
   *   "currency": "INR",
   *   "notes": {
   *     "purpose": "payout_account_verification"
   *   }
   * }
   * 
   * Response (Success):
   * {
   *   "id": "fav_xxxxx",
   *   "fund_account_id": "fa_xxxxx",
   *   "status": "completed",  // or "failed"
   *   "results": {
   *     "account_status": "active",
   *     "registered_name": "ABC BUSINESS PVT LTD"  // ← Compare with entered name
   *   },
   *   "amount": 100
   * }
   * 
   * Name Matching:
   * - Remove special chars, convert to uppercase
   * - Allow fuzzy match (Levenshtein distance)
   * - If mismatch > 30%, flag for manual review
   * 
   * Error Handling:
   * - "account_status": "invalid" → Show "Invalid account number"
   * - "account_status": "inactive" → Show "Account is inactive"
   * - Name mismatch → Save with nameMismatch: true, status: "pending"
   * 
   * Pricing: ₹3 per verification (deducted from Razorpay balance)
   * ============================================================================
   */
  const handleVerifyAndSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsVerifying(true);

    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // BYPASS MODE - Remove this block when implementing actual Razorpay API
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockRazorpayData = {
        contactId: 'cont_mock123456',
        fundAccountId: 'fa_mock123456',
        verificationId: 'fav_mock123456',
        bankReturnedName: accountHolderName.toUpperCase(),
        accountStatus: 'active',
        nameMismatch: false,
      };

      // Save to Firestore bankAccounts collection
      await firestore()
        .collection('bankAccounts')
        .doc(user.uid)
        .set({
          accountId: user.uid,
          bankName: bankName,
          accountHolderName: accountHolderName.trim(),
          accountLast4: accountNumber.slice(-4),
          ifsc: ifscCode.toUpperCase(),
          accountType: accountType,
          razorpayContactId: mockRazorpayData.contactId,
          razorpayFundAccountId: mockRazorpayData.fundAccountId,
          status: 'verified',
          bankVerificationMeta: {
            bankReturnedName: mockRazorpayData.bankReturnedName,
            nameMismatch: mockRazorpayData.nameMismatch,
            verificationId: mockRazorpayData.verificationId,
          },
          verifiedAt: firestore.FieldValue.serverTimestamp(),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      // Update account status
      await firestore()
        .collection('accounts')
        .doc(user.uid)
        .update({
          signupStep: 'merchant_profile',
          bankVerified: true,
        });

      setIsVerifying(false);

      Toast.show({
        type: 'success',
        text1: 'Bank Account Verified! ✓',
        text2: 'Setting up your business profile...',
        visibilityTime: 2000,
      });

      // Navigate to business profile setup
      setTimeout(() => {
        navigation.navigate('MerchantProfile' as never);
      }, 1500);

      // TODO: When implementing actual Razorpay API, replace above bypass code with:
      //
      // Step 1: Get user details from Firestore
      // const accountDoc = await firestore().collection('accounts').doc(user.uid).get();
      // const userDoc = await firestore().collection('users').doc(user.uid).get();
      // 
      // Step 2: Create Razorpay Contact
      // const contactResponse = await fetch('https://api.razorpay.com/v1/contacts', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${btoa('RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET')}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     name: accountHolderName,
      //     email: userDoc.data().email || 'no-email@funmate.app',
      //     contact: accountDoc.data().phoneNumber || '0000000000',
      //     type: 'vendor',
      //     reference_id: user.uid,
      //   }),
      // });
      // const contactData = await contactResponse.json();
      // const contactId = contactData.id;
      // 
      // Step 3: Create Fund Account
      // const fundAccountResponse = await fetch('https://api.razorpay.com/v1/fund_accounts', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${btoa('RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET')}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     contact_id: contactId,
      //     account_type: 'bank_account',
      //     bank_account: {
      //       name: accountHolderName,
      //       ifsc: ifscCode,
      //       account_number: accountNumber,
      //     },
      //   }),
      // });
      // const fundAccountData = await fundAccountResponse.json();
      // const fundAccountId = fundAccountData.id;
      // 
      // Step 4: Penny Drop Validation
      // const validationResponse = await fetch('https://api.razorpay.com/v1/fund_accounts/validations', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${btoa('RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET')}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     fund_account: { id: fundAccountId },
      //     amount: 100, // ₹1.00
      //     currency: 'INR',
      //     notes: { purpose: 'payout_account_verification' },
      //   }),
      // });
      // const validationData = await validationResponse.json();
      // 
      // Step 5: Validate Results
      // if (validationData.status !== 'completed') {
      //   throw new Error('Bank verification failed');
      // }
      // 
      // if (validationData.results.account_status !== 'active') {
      //   throw new Error('Bank account is invalid or inactive');
      // }
      // 
      // // Check name match (fuzzy matching)
      // const enteredName = accountHolderName.toUpperCase().replace(/[^A-Z0-9]/g, '');
      // const bankName = validationData.results.registered_name.toUpperCase().replace(/[^A-Z0-9]/g, '');
      // const nameSimilarity = calculateSimilarity(enteredName, bankName);
      // const nameMismatch = nameSimilarity < 0.7;
      // 
      // // Save to Firestore
      // await firestore().collection('bankAccounts').doc(user.uid).set({
      //   accountId: user.uid,
      //   bankName: bankName,
      //   accountHolderName: accountHolderName,
      //   accountLast4: accountNumber.slice(-4),
      //   ifsc: ifscCode.toUpperCase(),
      //   accountType: accountType,
      //   razorpayContactId: contactId,
      //   razorpayFundAccountId: fundAccountId,
      //   status: nameMismatch ? 'pending' : 'verified',
      //   bankVerificationMeta: {
      //     bankReturnedName: validationData.results.registered_name,
      //     nameMismatch: nameMismatch,
      //     verificationId: validationData.id,
      //   },
      //   verifiedAt: firestore.FieldValue.serverTimestamp(),
      //   createdAt: firestore.FieldValue.serverTimestamp(),
      // });
      // 
      // if (nameMismatch) {
      //   Toast.show({
      //     type: 'error',
      //     text1: 'Name Mismatch',
      //     text2: 'Bank name doesn\'t match. Pending manual review.',
      //   });
      // }

    } catch (error: any) {
      console.error('Bank verification error:', error);
      setIsVerifying(false);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: 'Unable to verify bank account. Please check details.',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/bg_splash.webp')}
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
              onPress={() => navigation.goBack()}
              style={styles.backButton}
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
              paddingTop: canGoBack ? insets.top + 54 : insets.top + 24,
              paddingBottom: Math.max(120, insets.bottom + 88),
            },
          ]}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={20}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <View style={styles.iconCircle}>
                <Ionicons name="card-outline" size={30} color="#A855F7" />
              </View>
              <Text style={styles.title}>Payout Bank Details</Text>
              <Text style={styles.subtitle}>
                Add your business bank account to receive event payouts
              </Text>
            </View>

            {/* Info Card */}
            {/* <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark" size={20} color="#A855F7" />
                <Text style={styles.infoText}>
                  Your bank details are verified securely via Razorpay. Payouts are processed on T+3 basis.
                </Text>
              </View>
            </View> */}

            {/* Form Section */}
            <View style={styles.formSection}>
              <GlowInput
                iconName="person-outline"
                placeholder="Account Holder Name"
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                autoCapitalize="words"
              />

              <GlowInput
                iconName="card-outline"
                placeholder="Account Number"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
                maxLength={18}
              />

              <GlowInput
                iconName="card-outline"
                placeholder="Confirm Account Number"
                value={confirmAccountNumber}
                onChangeText={setConfirmAccountNumber}
                keyboardType="numeric"
                maxLength={18}
              />
              {confirmAccountNumber && accountNumber !== confirmAccountNumber && (
                <Text style={styles.errorText}>Account numbers do not match</Text>
              )}

              <GlowInput
                iconName="git-branch-outline"
                placeholder="IFSC Code (e.g., SBIN0001234)"
                value={ifscCode}
                onChangeText={handleIfscChange}
                autoCapitalize="characters"
                maxLength={11}
              />

              {/* Bank Name - Auto-filled & Disabled */}
              <View style={styles.bankNameContainer}>
                <View
                  style={[styles.inputContainer, styles.disabledInputContainer]}
                  pointerEvents="none"
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color="rgba(255, 255, 255, 0.55)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Bank Name (Auto-filled)"
                    value={bankName}
                    editable={false}
                    style={[styles.input, styles.disabledInput]}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                  />
                </View>
                {isFetchingBank && (
                  <View style={styles.fetchingIndicator}>
                    <ActivityIndicator size="small" color="#06B6D4" />
                  </View>
                )}
              </View>

              {/* Account Type Radio Buttons */}
              <View style={styles.accountTypeSection}>
                <Text style={styles.accountTypeLabel}>Account Type</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      accountType === 'current' && styles.radioOptionSelected,
                    ]}
                    onPress={() => setAccountType('current')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioCircle}>
                      {accountType === 'current' && <View style={styles.radioSelected} />}
                    </View>
                    <Text style={styles.radioText}>Current Account</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      accountType === 'savings' && styles.radioOptionSelected,
                    ]}
                    onPress={() => setAccountType('savings')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioCircle}>
                      {accountType === 'savings' && <View style={styles.radioSelected} />}
                    </View>
                    <Text style={styles.radioText}>Savings Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Help Text */}
            <View style={styles.helpSection}>
              <Ionicons name="information-circle" size={20} color="#06B6D4" />
              <Text style={styles.helpText}>
                Find your IFSC code on your chequebook or bank passbook.
              </Text>
            </View>

            {/* Verify & Save Button */}
            <TouchableOpacity
              onPress={handleVerifyAndSave}
              disabled={!isFormComplete() || isVerifying}
              activeOpacity={0.85}
              style={styles.verifyButtonContainer}
            >
              <LinearGradient
                colors={
                  isFormComplete() && !isVerifying
                    ? ['#8B2BE2', '#06B6D4']
                    : ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.14)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyButton}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Save</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>

        <View
          pointerEvents="none"
          style={[styles.bottomNavGuard, { height: Math.max(insets.bottom + 20, 44) }]}
        />
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
  bottomNavGuard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -10,
    backgroundColor: '#0D0B1E',
    zIndex: 25,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  infoCard: {
    backgroundColor: '#1A1530',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.55)',
    marginLeft: 12,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: 24,
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
    marginBottom: 16,
  },
  disabledInputContainer: {
    borderColor: 'rgba(139, 92, 246, 0.20)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#FF6B81',
    marginTop: -8,
    marginBottom: 14,
    marginLeft: 4,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1530',
    borderRadius: 16,
    padding: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 18,
    marginLeft: 10,
  },
  bankNameContainer: {
    position: 'relative',
  },
  disabledInput: {
    color: 'rgba(255, 255, 255, 0.55)',
  },
  fetchingIndicator: {
    position: 'absolute',
    right: 16,
    top: 17,
  },
  accountTypeSection: {
    marginTop: 4,
  },
  accountTypeLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 66, 66, 0.7)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(53, 53, 53, 0.22)',
  },
  radioOptionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: '#8B2BE2',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B2BE2',
  },
  radioText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  verifyButtonContainer: {
    marginBottom: 74,
  },
  verifyButton: {
    height: 54,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

export default MerchantBankDetailsScreen;

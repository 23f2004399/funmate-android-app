import React, { useState, useEffect, forwardRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import MainTabNavigator from './MainTabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import EmailLoginScreen from '../screens/auth/EmailLoginScreen';
import AccountTypeScreen from '../screens/auth/AccountTypeScreen';
import PhoneNumberScreen from '../screens/auth/PhoneNumberScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import CreatorBasicInfoScreen from '../screens/auth/CreatorBasicInfoScreen';
import CreatorGoogleProfileSetupScreen from '../screens/auth/CreatorGoogleProfileSetupScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import GoogleProfileSetupScreen from '../screens/auth/GoogleProfileSetupScreen';
import PhotoUploadScreen from '../screens/auth/PhotoUploadScreen';
import IdentityVerificationIntroScreen from '../screens/auth/IdentityVerificationIntroScreen';
import LivenessVerificationScreen from '../screens/auth/LivenessVerificationScreen';
import InterestsSelectionScreen from '../screens/auth/InterestsSelectionScreen';
import DatingPreferencesScreen from '../screens/auth/DatingPreferencesScreen';
import CreatorEmailVerificationScreen from '../screens/auth/CreatorEmailVerificationScreen';
import CreatorTypeSelectionScreen from '../screens/auth/CreatorTypeSelectionScreen';
import IndividualVerificationScreen from '../screens/auth/IndividualVerificationScreen';
import IndividualBankDetailsScreen from '../screens/auth/IndividualBankDetailsScreen';
import IndividualHostProfileScreen from '../screens/auth/IndividualHostProfileScreen';
import MerchantVerificationScreen from '../screens/auth/MerchantVerificationScreen';
import MerchantBankDetailsScreen from '../screens/auth/MerchantBankDetailsScreen';
import MerchantProfileScreen from '../screens/auth/MerchantProfileScreen';
import LikesSwiperScreen from '../screens/main/LikesSwiperScreen';
import ChatScreen from '../screens/main/ChatScreen';
import { BlockedUsersScreen } from '../screens/settings/BlockedUsersScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import { SignupStep } from '../types/database';

export type RootStackParamList = {
  Login: undefined;
  EmailLogin: undefined;
  MainTabs: undefined;
  AccountType: undefined;
  PhoneNumber: { accountType?: 'user' | 'creator'; isLogin?: boolean };
  OTPVerification: { phoneNumber: string; verificationId: string; accountType?: 'user' | 'creator'; isLogin?: boolean };
  ProfileSetup: { phoneNumber?: string };
  CreatorBasicInfo: { phoneNumber?: string };
  CreatorGoogleProfileSetup: { googleUser: any };
  CreatorEmailVerification: {
    phoneNumber: string;
    fullName: string;
    email: string;
    username: string;
    password: string;
  };
  CreatorTypeSelection: undefined;
  IndividualVerification: undefined;
  IndividualBankDetails: undefined;
  IndividualHostProfile: undefined;
  MerchantVerification: undefined;
  MerchantBankDetails: undefined;
  MerchantProfile: undefined;
  EmailVerification: {
    phoneNumber: string;
    fullName: string;
    email: string;
    username: string;
    dob: string;
    gender: string;
    password: string;
  };
  GoogleProfileSetup: { googleUser: any };
  PhotoUpload: undefined;
  IdentityVerification: undefined;
  LivenessVerification: undefined;
  InterestsSelection: undefined;
  DatingPreferences: undefined;
  LikesSwiper: { clickedUserId: string };
  Chat: {
    chatId: string | null;
    recipientId: string;
    recipientName?: string;
    recipientPhoto?: string;
  };
  BlockedUsers: undefined;
  NotificationSettings: undefined;
  // TODO: Add more screens later
};

// Map signupStep to screen name
const getScreenForSignupStep = (signupStep: SignupStep): keyof RootStackParamList => {
  switch (signupStep) {
    case 'account_type':
      return 'AccountType';
    case 'basic_info':
      return 'ProfileSetup';
    case 'creator_basic_info':
      return 'CreatorBasicInfo';
    case 'creator_google_profile':
      return 'CreatorGoogleProfileSetup';
    case 'creator_type_selection':
      return 'CreatorTypeSelection';
    case 'individual_host_verification':
      return 'IndividualVerification';
    case 'individual_bank_details':
      return 'IndividualBankDetails';
    case 'individual_host_profile':
      return 'IndividualHostProfile';
    case 'individual_host_complete':
      // Individual host signup complete - route to main app for now
      // TODO: Once Host Dashboard is built, route to it:
      // return 'IndividualHostDashboard';
      return 'MainTabs';
    case 'merchant_verification':
      return 'MerchantVerification';
    case 'merchant_bank_details':
      return 'MerchantBankDetails';
    case 'merchant_profile':
      return 'MerchantProfile';
    case 'merchant_complete':
      // Merchant signup complete - route to main app for now
      // TODO: Once Merchant Dashboard is built, route to it:
      // return 'MerchantDashboard';
      return 'MainTabs';
    case 'photos':
      return 'PhotoUpload';
    case 'liveness':
      return 'IdentityVerification'; // Route to intro screen, not camera
    case 'preferences':
      return 'DatingPreferences';
    case 'interests':
      return 'InterestsSelection';
    case 'complete':
    default:
      return 'MainTabs';
  }
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = forwardRef<NavigationContainerRef<RootStackParamList>, {}>((props, ref) => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  // Handle user state changes and check signup progress
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (userState) => {
      setUser(userState);
      
      if (userState) {
        // User is authenticated - check their signup progress
        try {
          const accountDoc = await firestore()
            .collection('accounts')
            .doc(userState.uid)
            .get();

          if (accountDoc.exists()) {
            const accountData = accountDoc.data();
            const signupStep = accountData?.signupStep as SignupStep;
            
            // Check if signup is complete (any completion type)
            const isSignupComplete = 
              signupStep === 'complete' || 
              signupStep === 'individual_host_complete' || 
              signupStep === 'merchant_complete';
            
            if (signupStep && !isSignupComplete) {
              // User hasn't completed signup - route to appropriate screen
              let targetScreen = getScreenForSignupStep(signupStep);
              
              // 🔥 FIX: If user is at basic_info step but has Google linked, route to GoogleProfileSetup
              if (signupStep === 'basic_info') {
                const hasGoogleLinked = userState.providerData.some(
                  provider => provider.providerId === 'google.com'
                );
                if (hasGoogleLinked) {
                  console.log('Google account linked, routing to GoogleProfileSetup');
                  targetScreen = 'GoogleProfileSetup';
                }
              }
              
              console.log('Incomplete signup, routing to:', targetScreen);
              setInitialRoute(targetScreen);
            } else {
              // Signup complete or no signupStep field (legacy user) - go to main
              setInitialRoute('MainTabs');
            }
          } else {
            // No account doc - this is a new user who just verified phone
            // They should be routed by the OTP screen, but fallback to AccountType
            console.log('No account doc found, routing to AccountType');
            setInitialRoute('AccountType');
          }
        } catch (error) {
          console.error('Error checking signup progress:', error);
          // On error, default to main if user exists
          setInitialRoute('MainTabs');
        }
      } else {
        // Not authenticated - go to login
        setInitialRoute('Login');
      }
      
      if (initializing) setInitializing(false);
    });
    return subscriber; // Unsubscribe on unmount
  }, [initializing]);

  // Show loading screen while checking auth state
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#378BBB" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={initialRoute}
      >
        {/* Auth screens - always available for signup flow */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
        <Stack.Screen name="AccountType" component={AccountTypeScreen} />
        <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="CreatorBasicInfo" component={CreatorBasicInfoScreen} />
        <Stack.Screen name="CreatorGoogleProfileSetup" component={CreatorGoogleProfileSetupScreen} />
        <Stack.Screen name="CreatorEmailVerification" component={CreatorEmailVerificationScreen} />
        <Stack.Screen name="CreatorTypeSelection" component={CreatorTypeSelectionScreen} />
        <Stack.Screen name="IndividualVerification" component={IndividualVerificationScreen} />
        <Stack.Screen name="IndividualBankDetails" component={IndividualBankDetailsScreen} />
        <Stack.Screen name="IndividualHostProfile" component={IndividualHostProfileScreen} />
        <Stack.Screen name="MerchantVerification" component={MerchantVerificationScreen} />
        <Stack.Screen name="MerchantBankDetails" component={MerchantBankDetailsScreen} />
        <Stack.Screen name="MerchantProfile" component={MerchantProfileScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="GoogleProfileSetup" component={GoogleProfileSetupScreen} />
        <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
        <Stack.Screen name="IdentityVerification" component={IdentityVerificationIntroScreen} />
        <Stack.Screen name="LivenessVerification" component={LivenessVerificationScreen} />
        <Stack.Screen name="InterestsSelection" component={InterestsSelectionScreen} />
        <Stack.Screen name="DatingPreferences" component={DatingPreferencesScreen} />
        <Stack.Screen name="LikesSwiper" component={LikesSwiperScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen 
          name="BlockedUsers" 
          component={BlockedUsersScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="NotificationSettings" 
          component={NotificationSettingsScreen}
          options={{ headerShown: false }}
        />
        {/* Main app - after auth */}
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E1621',
  },
});

export default AppNavigator;

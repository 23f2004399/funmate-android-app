import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

export type RootStackParamList = {
  Login: undefined;
  EmailLogin: undefined;
  AccountType: undefined;
  PhoneNumber: { accountType?: 'user' | 'creator'; isLogin?: boolean };
  OTPVerification: { phoneNumber: string; verificationId: string; accountType?: 'user' | 'creator'; isLogin?: boolean };
  ProfileSetup: { phoneNumber: string };
  CreatorBasicInfo: { phoneNumber: string };
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
  MerchantVerification: undefined;
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
  // TODO: Add more screens later
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
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
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="GoogleProfileSetup" component={GoogleProfileSetupScreen} />
        <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
        <Stack.Screen name="IdentityVerification" component={IdentityVerificationIntroScreen} />
        <Stack.Screen name="LivenessVerification" component={LivenessVerificationScreen} />
        <Stack.Screen name="InterestsSelection" component={InterestsSelectionScreen} />
        <Stack.Screen name="DatingPreferences" component={DatingPreferencesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

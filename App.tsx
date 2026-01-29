/**
 * Funmate - Dating + Event Booking App
 * @format
 */

import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/screens/splash/SplashScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeAppCheckService } from './src/config/firebaseAppCheck';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // App Check disabled for now - will enable with Play Store release
    // initializeAppCheckService();
    
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '544227080732-ag40c3g4g64tgv910cu1it16bmmn4g3m.apps.googleusercontent.com', // Replace with your Web Client ID
      offlineAccess: false,
    });
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <Toast />
    </SafeAreaProvider>
  );
}

export default App;

/**
 * Identity Verification Introduction Screen
 * 
 * This screen explains the liveness verification process before opening the camera.
 * Shows instructions and has a button to start the verification.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface IdentityVerificationIntroScreenProps {
  navigation: any;
}

const IdentityVerificationIntroScreen: React.FC<IdentityVerificationIntroScreenProps> = ({ navigation }) => {
  // Check if user can go back (not the initial route after app restart)
  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" translucent={true} />

      {/* Header - only show back button if user navigated here from another screen */}
      {canGoBack && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          !canGoBack && styles.scrollContentNoHeader
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={80} color="#378BBB" />
        </View>

        <Text style={styles.title}>Verify Yourself</Text>
        <Text style={styles.subtitle}>
          Complete identity verification to keep our community safe
        </Text>

        {/* Why Verification */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Why do we need this?</Text>
          <View style={styles.reasonCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#378BBB" />
            <Text style={styles.reasonText}>Prevent fake profiles and catfishing</Text>
          </View>
          <View style={styles.reasonCard}>
            <Ionicons name="people-outline" size={24} color="#378BBB" />
            <Text style={styles.reasonText}>Build a trusted community</Text>
          </View>
          <View style={styles.reasonCard}>
            <Ionicons name="heart-outline" size={24} color="#378BBB" />
            <Text style={styles.reasonText}>Ensure authentic connections</Text>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>How it works:</Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Camera Opens</Text>
              <Text style={styles.stepDescription}>
                Your front camera will open with a circle overlay
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Follow Instructions</Text>
              <Text style={styles.stepDescription}>
                Center your face, turn left, turn right, and smile
              </Text>
            </View>
          </View>

          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Automatic Verification</Text>
              <Text style={styles.stepDescription}>
                We'll verify your identity and you're done!
              </Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips for success:</Text>
          <Text style={styles.tipText}>• Find a well-lit area</Text>
          <Text style={styles.tipText}>• Remove glasses if possible</Text>
          <Text style={styles.tipText}>• Look directly at the camera</Text>
          <Text style={styles.tipText}>• Move your head slowly and smoothly</Text>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyContainer}>
          <Ionicons name="lock-closed" size={16} color="#666666" />
          <Text style={styles.privacyText}>
            Your live selfie will not be saved. It's only used for verification.
          </Text>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('LivenessVerification')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#378BBB', '#4FC3F7']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.startButton}
          >
            <Ionicons name="camera" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.startButtonText}>Start Verification</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Skip Note */}
        <Text style={styles.skipNote}>
          You have 5 attempts to complete verification
        </Text>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 40,
  },
  scrollContentNoHeader: {
    paddingTop: 60, // Extra top padding when header is hidden
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Inter_24pt-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#B8C7D9',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: 'Inter_24pt-Regular',
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'Inter_24pt-Bold',
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16283D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  reasonText: {
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
    fontFamily: 'Inter_24pt-Regular',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#378BBB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_24pt-Bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Inter_24pt-Bold',
  },
  stepDescription: {
    fontSize: 14,
    color: '#B8C7D9',
    lineHeight: 20,
    fontFamily: 'Inter_24pt-Regular',
  },
  tipsContainer: {
    backgroundColor: '#16283D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: 'Inter_24pt-Bold',
  },
  tipText: {
    fontSize: 14,
    color: '#B8C7D9',
    marginBottom: 6,
    lineHeight: 20,
    fontFamily: 'Inter_24pt-Regular',
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  privacyText: {
    fontSize: 13,
    color: '#7F93AA',
    flex: 1,
    lineHeight: 18,
    fontFamily: 'Inter_24pt-Regular',
  },
  startButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    height: 52,
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_24pt-Bold',
  },
  skipNote: {
    fontSize: 13,
    color: '#7F93AA',
    textAlign: 'center',
    fontFamily: 'Inter_24pt-Regular',
  },
});

export default IdentityVerificationIntroScreen;

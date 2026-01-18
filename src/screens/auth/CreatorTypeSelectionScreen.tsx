/**
 * CREATOR TYPE SELECTION SCREEN
 * 
 * After email verification, creators choose their type:
 * - Individual Host (personal events, freelance organizers)
 * - Merchant Organizer (businesses, venues, brands)
 * 
 * Database Update:
 * - Updates accounts/{accountId}.creatorType to "individual" or "merchant"
 * 
 * Next Steps:
 * - Individual → IndividualVerificationScreen (Aadhaar/PAN)
 * - Merchant → MerchantVerificationScreen (GST/PAN/License)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface CreatorTypeSelectionScreenProps {
  navigation: any;
}

type CreatorType = 'individual' | 'merchant';

const CreatorTypeSelectionScreen: React.FC<CreatorTypeSelectionScreenProps> = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState<CreatorType | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Update creator type in accounts collection
   */
  const updateCreatorType = async (type: CreatorType) => {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    await firestore()
      .collection('accounts')
      .doc(user.uid)
      .update({
        creatorType: type,
      });

    console.log(`✅ Creator type set to: ${type}`);
  };

  /**
   * Handle selection and navigation
   */
  const handleContinue = async () => {
    if (!selectedType) {
      Toast.show({
        type: 'error',
        text1: 'Selection Required',
        text2: 'Please choose your creator type',
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Update creator type in database
      await updateCreatorType(selectedType);

      setLoading(false);

      Toast.show({
        type: 'success',
        text1: 'Type Selected',
        text2: `You're registered as ${selectedType === 'individual' ? 'Individual Host' : 'Merchant Organizer'}`,
        visibilityTime: 3000,
      });

      // Navigate to respective verification flow
      setTimeout(() => {
        if (selectedType === 'individual') {
          // TODO: Navigate to IndividualVerificationScreen
          navigation.navigate('IndividualVerification');
        } else {
          // TODO: Navigate to MerchantVerificationScreen
          navigation.navigate('MerchantVerification');
        }
      }, 1000);

    } catch (error: any) {
      setLoading(false);
      console.error('Error setting creator type:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Failed to update creator type',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          <Text style={styles.title}>Choose Your Creator Type</Text>
          <Text style={styles.subtitle}>
            Select how you'll be hosting events on Funmate
          </Text>

          {/* Individual Host Card */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedType === 'individual' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedType('individual')}
            activeOpacity={0.8}
          >
            <View style={styles.optionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name="person" 
                  size={32} 
                  color={selectedType === 'individual' ? '#FF4458' : '#666666'} 
                />
              </View>
              <View style={[
                styles.radioButton,
                selectedType === 'individual' && styles.radioButtonSelected,
              ]}>
                {selectedType === 'individual' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>

            <Text style={[
              styles.optionTitle,
              selectedType === 'individual' && styles.optionTitleSelected,
            ]}>
              Individual Host
            </Text>

            <Text style={styles.optionDescription}>
              Perfect for freelance event organizers, DJs, performers, and independent hosts
            </Text>

          </TouchableOpacity>

          {/* Merchant Organizer Card */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedType === 'merchant' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedType('merchant')}
            activeOpacity={0.8}
          >
            <View style={styles.optionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name="business" 
                  size={32} 
                  color={selectedType === 'merchant' ? '#FF4458' : '#666666'} 
                />
              </View>
              <View style={[
                styles.radioButton,
                selectedType === 'merchant' && styles.radioButtonSelected,
              ]}>
                {selectedType === 'merchant' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>

            <Text style={[
              styles.optionTitle,
              selectedType === 'merchant' && styles.optionTitleSelected,
            ]}>
              Merchant Organizer
            </Text>

            <Text style={styles.optionDescription}>
              For businesses, venues, brands, and registered organizations
            </Text>
          </TouchableOpacity>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedType && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedType || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 32,
    lineHeight: 24,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  optionCardSelected: {
    borderColor: '#FF4458',
    backgroundColor: '#FFF5F6',
    elevation: 4,
    shadowColor: '#FF4458',
    shadowOpacity: 0.2,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FF4458',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4458',
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  optionTitleSelected: {
    color: '#FF4458',
  },
  optionDescription: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 16,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: '#FF4458',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#FFB3BC',
    elevation: 0,
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreatorTypeSelectionScreen;

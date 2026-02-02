/**
 * Interests Selection Screen
 * 
 * Users select 5-15 interests from various categories.
 * Selected interests appear as chips at the top and can be removed.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface InterestsSelectionScreenProps {
  navigation: any;
}

// Interest categories with tags (similar to Bumble, Hinge, Tinder)
const INTEREST_CATEGORIES = [
  {
    id: 'movies_tv',
    name: 'Movies & TV',
    icon: 'film-outline',
    tags: [
      'Action Movies', 'Comedy', 'Drama', 'Sci-Fi', 'Horror',
      'Romantic Comedies', 'Documentaries', 'Anime', 'Thriller',
      'Marvel', 'DC', 'Netflix', 'Stand-up Comedy', 'Reality TV',
    ],
  },
  {
    id: 'music',
    name: 'Music',
    icon: 'musical-notes-outline',
    tags: [
      'Pop', 'Rock', 'Hip Hop', 'EDM', 'Jazz', 'Classical',
      'Country', 'R&B', 'Indie', 'K-Pop', 'Metal', 'Live Music',
      'Concerts', 'Music Festivals', 'Playing Instruments',
    ],
  },
  {
    id: 'sports',
    name: 'Sports & Fitness',
    icon: 'football-outline',
    tags: [
      'Football', 'Cricket', 'Basketball', 'Tennis', 'Badminton',
      'Swimming', 'Yoga', 'Gym', 'Running', 'Cycling', 'Hiking',
      'Boxing', 'Dancing', 'Rock Climbing', 'Martial Arts',
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: 'restaurant-outline',
    tags: [
      'Cooking', 'Baking', 'Coffee', 'Wine', 'Craft Beer',
      'Street Food', 'Fine Dining', 'Vegan', 'Italian Food',
      'Asian Cuisine', 'Pizza', 'Desserts', 'Food Trucks', 'BBQ',
    ],
  },
  {
    id: 'travel',
    name: 'Travel & Adventure',
    icon: 'airplane-outline',
    tags: [
      'Beach Vacations', 'Mountain Trips', 'Road Trips', 'Backpacking',
      'Luxury Travel', 'Solo Travel', 'City Breaks', 'Camping',
      'Photography', 'Adventure Sports', 'Cultural Tours', 'Cruises',
    ],
  },
  {
    id: 'hobbies',
    name: 'Hobbies & Interests',
    icon: 'color-palette-outline',
    tags: [
      'Photography', 'Painting', 'Drawing', 'Writing', 'Reading',
      'Gaming', 'Board Games', 'Puzzles', 'Collecting', 'DIY',
      'Gardening', 'Astronomy', 'Chess', 'Magic Tricks',
    ],
  },
  {
    id: 'arts',
    name: 'Arts & Culture',
    icon: 'brush-outline',
    tags: [
      'Museums', 'Art Galleries', 'Theater', 'Opera', 'Ballet',
      'Poetry', 'Literature', 'History', 'Philosophy', 'Design',
      'Architecture', 'Fashion', 'Vintage Shopping',
    ],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    icon: 'heart-outline',
    tags: [
      'Meditation', 'Mindfulness', 'Sustainability', 'Volunteering',
      'Animal Lover', 'Dogs', 'Cats', 'Plant Parent', 'Minimalism',
      'Festivals', 'Spirituality', 'Self-improvement', 'Podcasts',
    ],
  },
  {
    id: 'social',
    name: 'Social & Nightlife',
    icon: 'people-outline',
    tags: [
      'Clubbing', 'Karaoke', 'Pub Quiz', 'Game Nights', 'Brunch',
      'House Parties', 'Rooftop Bars', 'Comedy Shows', 'Trivia',
      'Socializing', 'Networking', 'Making Friends',
    ],
  },
  {
    id: 'tech',
    name: 'Tech & Innovation',
    icon: 'laptop-outline',
    tags: [
      'Coding', 'AI', 'Startups', 'Crypto', 'Tech Gadgets',
      'Video Editing', 'Content Creation', 'Social Media',
      'Blogging', 'YouTube', 'E-sports', 'VR/AR',
    ],
  },
];

const InterestsSelectionScreen: React.FC<InterestsSelectionScreenProps> = ({ navigation }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('movies_tv');
  const [saving, setSaving] = useState(false);

  const handleToggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      // Remove interest
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      // Add interest (max 15)
      if (selectedInterests.length >= 15) {
        Toast.show({
          type: 'info',
          text1: 'Maximum Reached',
          text2: 'You can select up to 15 interests',
          visibilityTime: 2000,
        });
        return;
      }
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  /**
   * Skip interests selection - creates empty interests array
   */
  const handleSkip = async () => {
    setSaving(true);

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Save empty interests array (for profile completion tracking)
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          interests: [],
        });

      // Update signupStep to preferences
      await firestore()
        .collection('accounts')
        .doc(userId)
        .update({
          signupStep: 'preferences',
        });

      console.log('✅ Interests skipped - empty array saved');
      
      // Navigate to Dating Preferences screen
      navigation.navigate('DatingPreferences' as never);

    } catch (error: any) {
      console.error('❌ Error skipping interests:', error);
      Toast.show({
        type: 'error',
        text1: 'Skip Failed',
        text2: error.message || 'Could not skip. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (selectedInterests.length < 5) {
      Toast.show({
        type: 'error',
        text1: 'Select More Interests',
        text2: `Please select at least 5 interests (${selectedInterests.length}/5)`,
        visibilityTime: 3000,
      });
      return;
    }

    setSaving(true);

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Save interests to users collection (following database schema)
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          interests: selectedInterests,
        });

      // Update signupStep to preferences
      await firestore()
        .collection('accounts')
        .doc(userId)
        .update({
          signupStep: 'preferences',
        });

      console.log('✅ Interests saved:', selectedInterests);
      
      Toast.show({
        type: 'success',
        text1: 'Interests Saved!',
        text2: `${selectedInterests.length} interests selected`,
        visibilityTime: 2000,
      });

      // Navigate to Dating Preferences screen
      setTimeout(() => {
        navigation.navigate('DatingPreferences' as never);
      }, 1500);

    } catch (error: any) {
      console.error('❌ Error saving interests:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: error.message || 'Could not save interests. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" />

      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Your Interests</Text>
          <Text style={styles.subtitle}>Select 5-15 interests to help us find your match</Text>
        </View>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {selectedInterests.length} / 15 selected
        </Text>
        <Text style={[
          styles.minText,
          selectedInterests.length >= 5 && styles.minTextSuccess
        ]}>
          {selectedInterests.length >= 5 ? '✓ Minimum met' : `Minimum: 5`}
        </Text>
      </View>

      {/* Selected Interests Chips */}
      {selectedInterests.length > 0 && (
        <View style={styles.selectedContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedChipsContainer}
          >
            {selectedInterests.map((interest) => (
              <TouchableOpacity
                key={interest}
                onPress={() => handleToggleInterest(interest)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#378BBB', '#4FC3F7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.selectedChip}
                >
                  <Text style={styles.selectedChipText}>{interest}</Text>
                  <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Categories Grid */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
          style={styles.categoriesScroll}
        >
          {INTEREST_CATEGORIES.map((category) => {
            const selectedCount = category.tags.filter(tag => selectedInterests.includes(tag)).length;
            const isExpanded = expandedCategory === category.id;
            
            return (
              <View key={category.id} style={styles.categoryWrapper}>
                <TouchableOpacity
                  style={[styles.categoryIconButton, isExpanded && styles.categoryIconButtonActive]}
                  onPress={() => setExpandedCategory(isExpanded ? null : category.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={category.icon as any} size={32} color={isExpanded ? "#FFFFFF" : "#378BBB"} />
                  {selectedCount > 0 && (
                    <View style={styles.iconBadge}>
                      <Text style={styles.iconBadgeText}>{selectedCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        {/* Expanded Category Content */}
        {expandedCategory && (
          <View style={styles.expandedSection}>
            {(() => {
              const category = INTEREST_CATEGORIES.find(c => c.id === expandedCategory);
              if (!category) return null;
              
              return (
                <>
                  <View style={styles.expandedHeader}>
                    <Text style={styles.expandedTitle}>{category.name}</Text>
                    <TouchableOpacity
                      onPress={() => setExpandedCategory(null)}
                      activeOpacity={0.7}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#7F93AA" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.tagsContainer}>
                    {category.tags.map((tag) => {
                      const isSelected = selectedInterests.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => handleToggleInterest(tag)}
                          activeOpacity={0.7}
                        >
                          {isSelected ? (
                            <LinearGradient
                              colors={['#378BBB', '#4FC3F7']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.tag}
                            >
                              <Text style={styles.tagTextSelected}>{tag}</Text>
                              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            </LinearGradient>
                          ) : (
                            <View style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              );
            })()}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedInterests.length >= 5 ? ['#378BBB', '#4FC3F7'] : ['#1B2F48', '#1B2F48']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            <Text style={[styles.continueButtonText, selectedInterests.length < 5 && styles.continueButtonTextDisabled]}>
              {saving ? 'Saving...' : `Continue ${selectedInterests.length > 0 ? `(${selectedInterests.length})` : ''}`}
            </Text>
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
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#378BBB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#B8C7D9',
    lineHeight: 20,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#16283D',
    borderBottomWidth: 1,
    borderBottomColor: '#233B57',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#378BBB',
  },
  minText: {
    fontSize: 14,
    color: '#7F93AA',
    fontWeight: '500',
  },
  minTextSuccess: {
    color: '#2ECC71',
  },
  selectedContainer: {
    backgroundColor: '#16283D',
    borderBottomWidth: 1,
    borderBottomColor: '#233B57',
    paddingVertical: 12,
  },
  selectedChipsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 2,
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  categoriesScroll: {
    paddingVertical: 20,
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  categoryWrapper: {
    width: 100,
    height: 100,
  },
  categoryIconButton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#16283D',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  categoryIconButtonActive: {
    backgroundColor: '#378BBB',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  iconBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF4D6D',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  expandedSection: {
    backgroundColor: '#16283D',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expandedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#233B57',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#16283D',
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#378BBB',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#0E1621',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16283D',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#378BBB',
    gap: 6,
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  tagText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#16283D',
    borderTopWidth: 1,
    borderTopColor: '#233B57',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  continueButtonTextDisabled: {
    color: '#7F93AA',
  },
});

export default InterestsSelectionScreen;

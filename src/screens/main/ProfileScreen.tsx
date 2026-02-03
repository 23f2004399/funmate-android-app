/**
 * PROFILE SCREEN
 * 
 * User's complete profile with:
 * - Profile photo with completion % ring
 * - Editable fields (username, bio, interests, preferences, radius)
 * - Non-editable fields (name, age, gender)
 * - Enable location button
 * - Logout functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Modal,
  FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Circle } from 'react-native-svg';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Geolocation from '@react-native-community/geolocation';
import Slider from '@react-native-community/slider';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { calculateProfileCompleteness, getMissingFields } from '../../utils/profileCompleteness';
import { useAlert } from '../../contexts/AlertContext';

type RelationshipIntent = 'casual' | 'long_term' | 'hookups' | 'friendship' | 'unsure';
type Gender = 'male' | 'female' | 'trans' | 'non_binary';

const RELATIONSHIP_OPTIONS: { value: RelationshipIntent; label: string; icon: string }[] = [
  { value: 'long_term', label: 'Long-term', icon: 'heart' },
  { value: 'casual', label: 'Casual', icon: 'cafe' },
  { value: 'friendship', label: 'Friendship', icon: 'people' },
  { value: 'hookups', label: 'Hookups', icon: 'flame' },
  { value: 'unsure', label: 'Unsure', icon: 'help-circle' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'trans', label: 'Trans' },
  { value: 'non_binary', label: 'Non-binary' },
];

// Height options in cm (4'8" to 7'0")
const HEIGHT_OPTIONS = [
  { cm: 142, label: "4'8\" (142 cm)" },
  { cm: 145, label: "4'9\" (145 cm)" },
  { cm: 147, label: "4'10\" (147 cm)" },
  { cm: 150, label: "4'11\" (150 cm)" },
  { cm: 152, label: "5'0\" (152 cm)" },
  { cm: 155, label: "5'1\" (155 cm)" },
  { cm: 157, label: "5'2\" (157 cm)" },
  { cm: 160, label: "5'3\" (160 cm)" },
  { cm: 163, label: "5'4\" (163 cm)" },
  { cm: 165, label: "5'5\" (165 cm)" },
  { cm: 168, label: "5'6\" (168 cm)" },
  { cm: 170, label: "5'7\" (170 cm)" },
  { cm: 173, label: "5'8\" (173 cm)" },
  { cm: 175, label: "5'9\" (175 cm)" },
  { cm: 178, label: "5'10\" (178 cm)" },
  { cm: 180, label: "5'11\" (180 cm)" },
  { cm: 183, label: "6'0\" (183 cm)" },
  { cm: 185, label: "6'1\" (185 cm)" },
  { cm: 188, label: "6'2\" (188 cm)" },
  { cm: 191, label: "6'3\" (191 cm)" },
  { cm: 193, label: "6'4\" (193 cm)" },
  { cm: 196, label: "6'5\" (196 cm)" },
  { cm: 198, label: "6'6\" (198 cm)" },
  { cm: 201, label: "6'7\" (201 cm)" },
  { cm: 203, label: "6'8\" (203 cm)" },
  { cm: 206, label: "6'9\" (206 cm)" },
  { cm: 208, label: "6'10\" (208 cm)" },
  { cm: 211, label: "6'11\" (211 cm)" },
  { cm: 213, label: "7'0\" (213 cm)" },
];

// Occupation suggestions for autocomplete
const OCCUPATION_SUGGESTIONS = [
  'Software Engineer', 'Doctor', 'Nurse', 'Teacher', 'Professor',
  'Lawyer', 'Accountant', 'Marketing Manager', 'Data Analyst', 'Designer',
  'Product Manager', 'Consultant', 'Entrepreneur', 'Student', 'Researcher',
  'Engineer', 'Architect', 'Photographer', 'Writer', 'Artist',
  'Chef', 'Pilot', 'Flight Attendant', 'HR Manager', 'Sales Manager',
  'Business Analyst', 'Financial Analyst', 'Investment Banker', 'Trader', 'Real Estate Agent',
  'Dentist', 'Pharmacist', 'Physiotherapist', 'Psychologist', 'Veterinarian',
  'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Chemical Engineer',
  'Content Creator', 'Influencer', 'Journalist', 'Editor', 'Filmmaker',
  'Fashion Designer', 'Interior Designer', 'Graphic Designer', 'UX Designer', 'UI Designer',
  'Personal Trainer', 'Yoga Instructor', 'Life Coach', 'Counselor',
  'Police Officer', 'Military', 'Firefighter', 'Government Employee',
  'Banker', 'Insurance Agent', 'Travel Agent', 'Event Planner',
  'CA', 'CS', 'MBA', 'PhD Student', 'Medical Student', 'Law Student',
];

/**
 * Convert cm to feet/inches string
 */
const cmToFeetInches = (cm: number): string => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
};

// Interest categories (matching signup)
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

const ProfileScreen = ({ navigation }: any) => {
  const { showConfirm, showWarning } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [completeness, setCompleteness] = useState(0);

  // Editable fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [relationshipIntent, setRelationshipIntent] = useState<RelationshipIntent | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [matchRadiusKm, setMatchRadiusKm] = useState(25);
  
  // New fields
  const [height, setHeight] = useState<number | null>(null);
  const [heightDisplayUnit, setHeightDisplayUnit] = useState<'cm' | 'ft'>('ft');
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [filteredOccupations, setFilteredOccupations] = useState<string[]>([]);
  const [showOccupationSuggestions, setShowOccupationSuggestions] = useState(false);
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');

  const [editMode, setEditMode] = useState<string | null>(null); // 'bio', 'interests', etc.
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [tempInterests, setTempInterests] = useState<string[]>([]);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  const userId = auth().currentUser?.uid;

  /**
   * Fetch user data
   */
  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await firestore().collection('users').doc(userId).get();
        const data = userDoc.data();

        if (data) {
          setUserData(data);
          setName(data.name || '');
          setUsername(data.username || '');
          setBio(data.bio || '');
          setInterests(data.interests || []);
          setRelationshipIntent(data.relationshipIntent || null);
          setInterestedIn(data.interestedIn || []);
          setMatchRadiusKm(data.matchRadiusKm || 25);
          
          // Load new fields
          setHeight(data.height?.value || null);
          setHeightDisplayUnit(data.height?.displayUnit || 'ft');
          setOccupation(data.occupation || '');
          setInstagram(data.socialHandles?.instagram || '');
          setLinkedin(data.socialHandles?.linkedin || '');
          setFacebook(data.socialHandles?.facebook || '');
          setTwitter(data.socialHandles?.twitter || '');

          // Calculate completeness
          const percent = calculateProfileCompleteness(data);
          setCompleteness(percent);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  /**
   * Refresh profile data and recalculate completeness
   */
  const refreshProfileData = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Check current location permission
      const hasLocationPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      // Fetch fresh user data from Firestore
      const userDoc = await firestore().collection('users').doc(userId).get();
      const data = userDoc.data();

      if (data) {
        // If permission was revoked, clear location from Firestore
        if (!hasLocationPermission && data.location) {
          await firestore()
            .collection('users')
            .doc(userId)
            .update({ location: null });
          data.location = null;
        }

        setUserData(data);
        setUsername(data.username || '');
        setBio(data.bio || '');
        setInterests(data.interests || []);
        setRelationshipIntent(data.relationshipIntent || null);
        setInterestedIn(data.interestedIn || []);
        setMatchRadiusKm(data.matchRadiusKm || 25);
        
        // Load new fields on refresh
        setHeight(data.height?.value || null);
        setHeightDisplayUnit(data.height?.displayUnit || 'ft');
        setOccupation(data.occupation || '');
        setInstagram(data.socialHandles?.instagram || '');
        setLinkedin(data.socialHandles?.linkedin || '');
        setFacebook(data.socialHandles?.facebook || '');
        setTwitter(data.socialHandles?.twitter || '');

        // Recalculate completeness with current data
        const percent = calculateProfileCompleteness(data);
        setCompleteness(percent);
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    }
  }, [userId]);

  /**
   * Refresh on screen focus (e.g., returning from Settings)
   */
  useFocusEffect(
    useCallback(() => {
      refreshProfileData();
    }, [refreshProfileData])
  );

  /**
   * Refresh when app returns from background (e.g., after changing permissions in Settings)
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshProfileData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [refreshProfileData]);

  /**
   * Save profile changes
   */
  const handleSave = async () => {
    // Validate name - cannot be empty
    if (editMode === 'name') {
      if (!name.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Name Required',
          text2: 'Full name cannot be empty',
          visibilityTime: 3000,
        });
        return;
      }
    }

    // Validation for interests
    if (editMode === 'interests') {
      if (tempInterests.length > 0 && tempInterests.length < 5) {
        Toast.show({
          type: 'error',
          text1: 'Select More Interests',
          text2: `You must select at least 5 interests or none (${tempInterests.length}/5)`,
          visibilityTime: 3000,
        });
        return;
      }
    }

    setSaving(true);

    try {
      if (!userId) throw new Error('User not authenticated');

      const updateData: any = {};

      if (editMode === 'name') updateData.name = name.trim();
      if (editMode === 'username') updateData.username = username;
      if (editMode === 'bio') updateData.bio = bio;
      if (editMode === 'interests') updateData.interests = tempInterests;
      if (editMode === 'intent') updateData.relationshipIntent = relationshipIntent;
      if (editMode === 'gender') updateData.interestedIn = interestedIn;
      if (editMode === 'radius') updateData.matchRadiusKm = matchRadiusKm;
      if (editMode === 'height') updateData.height = height ? { value: height, displayUnit: heightDisplayUnit } : null;
      if (editMode === 'occupation') updateData.occupation = occupation.trim() || null;
      if (editMode === 'social') updateData.socialHandles = (instagram || linkedin || facebook || twitter) ? {
        instagram: instagram.trim() || null,
        linkedin: linkedin.trim() || null,
        facebook: facebook.trim() || null,
        twitter: twitter.trim() || null,
      } : null;

      await firestore()
        .collection('users')
        .doc(userId)
        .update(updateData);

      // Update local state
      if (editMode === 'interests') {
        setInterests(tempInterests);
      }

      // Recalculate completeness
      const updatedData = {
        ...userData,
        name: editMode === 'name' ? name.trim() : userData.name,
        username,
        bio,
        interests: editMode === 'interests' ? tempInterests : interests,
        relationshipIntent,
        interestedIn,
        matchRadiusKm,
      };
      const percent = calculateProfileCompleteness(updatedData);
      setCompleteness(percent);
      setUserData(updatedData);

      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your changes have been saved',
        visibilityTime: 2000,
      });

      setEditMode(null);
      setExpandedCategory(null);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: error.message || 'Could not save changes',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Request location permission
   */
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // First check if permission is already granted
        const checkResult = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (checkResult) {
          console.log('Location permission already granted');
          return true;
        }

        // Request permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Funmate needs access to your location to find matches nearby',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        console.log('Permission request result:', granted);
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          showWarning(
            'Permission Required',
            'Location permission was denied. Please enable it in Settings > Apps > Funmate > Permissions > Location'
          );
          return false;
        } else {
          return false;
        }
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  /**
   * Get current location coordinates
   */
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      // Try network-based location first (WiFi/cell towers) - works indoors
      console.log('Attempting to get location (network-based)...');
      
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location obtained:', position.coords);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('❌ Location error:', error);
          // If network location fails, show user-friendly error
          resolve(null);
        },
        { 
          enableHighAccuracy: false,  // Use network location (WiFi/cell) - faster, works indoors
          timeout: 15000,              // 15 seconds timeout
          maximumAge: 300000           // Accept location up to 5 minutes old
        }
      );
    });
  };

  /**
   * Enable location
   */
  const handleEnableLocation = async () => {
    try {
      console.log('🔍 Starting location enable flow...');
      
      const hasPermission = await requestLocationPermission();
      
      console.log('Permission result:', hasPermission);
      
      if (!hasPermission) {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Location access is required for better matches',
          visibilityTime: 3000,
        });
        return;
      }

      console.log('✅ Permission granted, getting location...');

      Toast.show({
        type: 'info',
        text1: 'Getting Location...',
        text2: 'Using WiFi and cell towers',
        visibilityTime: 3000,
      });

      const coords = await getCurrentLocation();
      
      if (!coords) {
        showWarning(
          'Location Unavailable',
          'Could not get your location. Please ensure Location/GPS is enabled in your device settings.\n\nGo to: Settings > Location > Turn ON'
        );
        return;
      }

      console.log('✅ Location obtained, saving to Firestore...');

      // Save location to Firestore
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        });

      console.log('✅ Location saved successfully');

      // Update local state
      const updatedData = {
        ...userData,
        location: coords,
      };
      setUserData(updatedData);
      const percent = calculateProfileCompleteness(updatedData);
      setCompleteness(percent);

      Toast.show({
        type: 'success',
        text1: 'Location Enabled! 📍',
        text2: 'You\'ll now see matches nearby',
        visibilityTime: 2000,
      });

    } catch (error: any) {
      console.error('❌ Error enabling location:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Could not enable location',
        visibilityTime: 3000,
      });
    }
  };

  /**
   * Logout
   */
  const handleLogout = () => {
    showConfirm(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        try {
          await auth().signOut();
          
          // Reset navigation stack to Login
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
          
          Toast.show({
            type: 'success',
            text1: 'Logged Out',
            text2: 'See you soon!',
            visibilityTime: 2000,
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
      { confirmText: 'Logout', destructive: true, icon: 'log-out-outline' }
    );
  };

  /**
   * Toggle interest
   */
  const toggleInterest = (interest: string) => {
    if (tempInterests.includes(interest)) {
      setTempInterests(prev => prev.filter(i => i !== interest));
    } else {
      if (tempInterests.length >= 15) {
        Toast.show({
          type: 'error',
          text1: 'Maximum Reached',
          text2: 'You can select up to 15 interests',
          visibilityTime: 2000,
        });
        return;
      }
      setTempInterests(prev => [...prev, interest]);
    }
  };

  /**
   * Toggle gender preference
   */
  const toggleGenderPreference = (gender: Gender) => {
    if (interestedIn.includes(gender)) {
      setInterestedIn(prev => prev.filter(g => g !== gender));
    } else {
      setInterestedIn(prev => [...prev, gender]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0E1621" />
        <ActivityIndicator size="large" color="#378BBB" />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No profile data found</Text>
      </View>
    );
  }

  const primaryPhoto = userData.photos?.find((p: any) => p.isPrimary)?.url || 
                       userData.photos?.[0]?.url || 
                       'https://via.placeholder.com/150';

  const missingFields = getMissingFields(userData);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={120}
        extraHeight={180}
        keyboardOpeningTime={0}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerActions}>
            <View style={styles.settingsIconContainer}>
              <TouchableOpacity 
                style={styles.gearIcon}
                onPress={() => setShowSettingsDropdown(!showSettingsDropdown)}
              >
                <Ionicons name="settings-outline" size={24} color="#378BBB" />
              </TouchableOpacity>
              
              {showSettingsDropdown && (
                <View style={styles.settingsDropdown}>
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowSettingsDropdown(false);
                      (navigation as any).navigate('NotificationSettings');
                    }}
                  >
                    <Ionicons name="notifications-outline" size={20} color="#378BBB" />
                    <Text style={styles.dropdownItemText}>Notification Settings</Text>
                  </TouchableOpacity>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowSettingsDropdown(false);
                      (navigation as any).navigate('BlockedUsers');
                    }}
                  >
                    <Ionicons name="ban-outline" size={20} color="#378BBB" />
                    <Text style={styles.dropdownItemText}>Blocked Users</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#FF4D6D" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Photo with Completion Ring */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            <Svg width={140} height={140} style={styles.progressRing}>
              <Circle
                cx="70"
                cy="70"
                r="65"
                stroke="#E0E0E0"
                strokeWidth="6"
                fill="none"
              />
              <Circle
                cx="70"
                cy="70"
                r="65"
                stroke="#378BBB"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 65}`}
                strokeDashoffset={`${2 * Math.PI * 65 * (1 - completeness / 100)}`}
                strokeLinecap="round"
                rotation="-90"
                origin="70, 70"
              />
            </Svg>
            <Image source={{ uri: primaryPhoto }} style={styles.profilePhoto} />
          </View>
          <View style={styles.completenessChip}>
            <Text style={styles.completenessText}>{completeness}% Complete</Text>
          </View>
          <View style={styles.usernameContainer}>
            <View style={styles.usernameWrapper}>
              {editMode === 'username' ? (
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor="#7F93AA"
                  autoFocus
                />
              ) : (
                <Text style={styles.usernameText}>@{username || 'Not set'}</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.usernameEditButton}
              onPress={() => editMode === 'username' ? handleSave() : setEditMode('username')}
            >
              {editMode === 'username' ? (
                <Text style={styles.usernameSaveText}>Save</Text>
              ) : (
                <Ionicons name="pencil" size={22} color="#378BBB" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* About Me Section */}
        <View style={styles.section}>
          <Text style={styles.aboutMeHeader}>About Me</Text>

          {/* Bio */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldLeft}>
              <Ionicons name="document-text" size={20} color="#378BBB" style={styles.fieldIcon} />
              <Text style={styles.fieldLabel}>Bio</Text>
              {!bio && <Ionicons name="alert-circle" size={16} color="#F4B400" style={styles.fieldWarningIcon} />}
            </View>
            {editMode === 'bio' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('bio')}>
                <Ionicons name="pencil" size={22} color="#378BBB" />
              </TouchableOpacity>
            )}
          </View>
          {editMode === 'bio' ? (
            <TextInput
              style={[styles.fieldInput, styles.bioFieldInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself (min 20 characters)"
              placeholderTextColor="#7F93AA"
              multiline
              maxLength={500}
              autoFocus
            />
          ) : (
            <View style={styles.bioDisplayBox}>
              <Text style={styles.bioDisplayText}>{bio || 'No bio yet'}</Text>
            </View>
          )}

          <View style={styles.fieldDivider} />

          {/* Full Name and Age Row */}
          <View style={styles.twoColumnRow}>
            {/* Full Name - Left */}
            <View style={styles.columnLeft}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldLeft}>
                  <Ionicons name="person" size={20} color="#378BBB" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Full Name</Text>
                </View>
                {editMode === 'name' ? (
                  <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButton}>Save</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setEditMode('name')}>
                    <Ionicons name="pencil" size={22} color="#378BBB" />
                  </TouchableOpacity>
                )}
              </View>
              {editMode === 'name' ? (
                <TextInput
                  style={styles.fieldInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#7F93AA"
                  autoFocus
                />
              ) : (
                <View style={styles.fieldValueBox}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Text style={styles.fieldValueBoxText}>{userData.name}</Text>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Age - Right */}
            <View style={styles.columnRight}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldLeft}>
                  <Ionicons name="calendar" size={20} color="#378BBB" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Age</Text>
                </View>
              </View>
              <View style={styles.fieldValueBox}>
                <Text style={styles.fieldValueBoxText}>{userData.age} years old</Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Gender and Height Row */}
          <View style={styles.twoColumnRow}>
            {/* Gender - Left */}
            <View style={styles.columnLeft}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldLeft}>
                  <Ionicons name={userData.gender === 'male' ? 'male' : 'female'} size={20} color="#378BBB" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Gender</Text>
                </View>
              </View>
              <View style={styles.fieldValueBox}>
                <Text style={styles.fieldValueBoxText}>{userData.gender}</Text>
              </View>
            </View>

            {/* Height - Right */}
            <View style={styles.columnRight}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldLeft}>
                  <Ionicons name="body" size={20} color="#378BBB" style={styles.fieldIcon} />
                  <Text style={styles.fieldLabel}>Height</Text>
                  {!height && <Ionicons name="alert-circle" size={16} color="#F4B400" style={styles.fieldWarningIcon} />}
                </View>
                {editMode === 'height' ? (
                  <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButton}>Save</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setEditMode('height')}>
                    <Ionicons name="pencil" size={22} color="#378BBB" />
                  </TouchableOpacity>
                )}
              </View>
              {editMode === 'height' ? (
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter height in cm"
                  placeholderTextColor="#7F93AA"
                  value={height ? height.toString() : ''}
                  onChangeText={(text) => {
                    const numValue = parseInt(text);
                    if (text === '') {
                      setHeight(null);
                    } else if (!isNaN(numValue) && numValue > 0 && numValue <= 300) {
                      setHeight(numValue);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                  autoFocus
                />
              ) : (
                <View style={styles.fieldValueBox}>
                  <Text style={styles.fieldValueBoxText}>{height ? `${height} cm` : 'Not set'}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Occupation */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldLeft}>
              <Ionicons name="briefcase" size={20} color="#378BBB" style={styles.fieldIcon} />
              <Text style={styles.fieldLabel}>Occupation</Text>
              {!occupation && <Ionicons name="alert-circle" size={16} color="#F4B400" style={styles.fieldWarningIcon} />}
            </View>
            {editMode === 'occupation' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('occupation')}>
                <Ionicons name="pencil" size={22} color="#378BBB" />
              </TouchableOpacity>
            )}
          </View>
          {editMode === 'occupation' ? (
            <View>
              <TextInput
                style={styles.fieldInput}
                value={occupation}
                onChangeText={(text) => {
                  setOccupation(text);
                  if (text.length >= 2) {
                    const filtered = OCCUPATION_SUGGESTIONS.filter(occ =>
                      occ.toLowerCase().includes(text.toLowerCase())
                    ).slice(0, 5);
                    setFilteredOccupations(filtered);
                  } else {
                    setFilteredOccupations([]);
                  }
                }}
                placeholder="e.g., Software Engineer, Doctor, Student..."
                placeholderTextColor="#7F93AA"
                maxLength={50}
                autoFocus
              />
              {filteredOccupations.length > 0 && occupation.length >= 2 && (
                <View style={styles.suggestionsList}>
                  {filteredOccupations.map((occ, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItemInline}
                      onPress={() => {
                        setOccupation(occ);
                        setFilteredOccupations([]);
                      }}
                    >
                      <Text style={styles.suggestionTextInline}>{occ}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.fieldValueBox}>
              <Text style={styles.fieldValueBoxText}>{occupation || 'Not set'}</Text>
            </View>
          )}
        </View>

        {/* My Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.aboutMeHeader}>My Preferences</Text>

        {/* Interests (Editable - Full Section Like Signup) */}
        <View style={styles.preferenceSubSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithIcon}>
              {interests.length === 0 && <Ionicons name="alert-circle" size={18} color="#F4B400" style={styles.warningIcon} />}
              <Text style={styles.sectionTitle}>Interests</Text>
            </View>
            {editMode === 'interests' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={() => {
                  setTempInterests(interests);
                  setEditMode('interests');
                }}
              >
                <Ionicons name="pencil" size={22} color="#378BBB" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'interests' ? (
            <>
              {/* Interest Count */}
              <View style={styles.interestCount}>
                <Text style={styles.countText}>
                  {tempInterests.length} / 15 selected
                </Text>
                <Text style={[
                  styles.minText,
                  tempInterests.length >= 5 && styles.minTextSuccess
                ]}>
                  {tempInterests.length >= 5 ? '✓ Minimum met' : tempInterests.length === 0 ? 'Min: 5 or none' : `Min: 5 (${tempInterests.length}/5)`}
                </Text>
              </View>

              {/* Selected Chips */}
              {tempInterests.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.selectedChipsScroll}
                  contentContainerStyle={styles.selectedChipsContainer}
                >
                  {tempInterests.map((interest) => (
                    <TouchableOpacity
                      key={interest}
                      style={styles.selectedChip}
                      onPress={() => toggleInterest(interest)}
                    >
                      <Text style={styles.selectedChipText}>{interest}</Text>
                      <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Categories - Horizontal Icon Scroll (matching signup screen) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScrollContent}
                style={styles.categoriesScroll}
              >
                {INTEREST_CATEGORIES.map((category) => {
                  const selectedCount = category.tags.filter(tag => tempInterests.includes(tag)).length;
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
                            const isSelected = tempInterests.includes(tag);
                            return (
                              <TouchableOpacity
                                key={tag}
                                style={[
                                  styles.interestTag,
                                  isSelected && styles.interestTagSelected,
                                ]}
                                onPress={() => toggleInterest(tag)}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.interestTagText,
                                    isSelected && styles.interestTagTextSelected,
                                  ]}
                                >
                                  {tag}
                                </Text>
                                {isSelected && (
                                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
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
            </>
          ) : (
            <View style={styles.interestsDisplay}>
              {interests.length > 0 ? (
                interests.map((interest, i) => (
                  <View key={i} style={styles.interestDisplayTag}>
                    <Text style={styles.interestDisplayTagText}>{interest}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.displayValue}>No interests selected</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.preferenceDivider} />

        {/* Looking For and Interested In Row */}
        <View style={styles.twoColumnRow}>
          {/* Interested In - Left */}
          <View style={styles.columnLeft}>
            <View style={styles.preferenceSubSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.titleWithIcon}>
                  {interestedIn.length === 0 && <Ionicons name="alert-circle" size={18} color="#F4B400" style={styles.warningIcon} />}
                  <Text style={styles.sectionTitle}>Interested In</Text>
                </View>
                {editMode === 'gender' ? (
                  <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButton}>Save</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setEditMode('gender')}>
                    <Ionicons name="pencil" size={22} color="#378BBB" />
                  </TouchableOpacity>
                )}
              </View>
              
              {editMode === 'gender' ? (
                <View style={styles.optionsGrid}>
                  {GENDER_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        interestedIn.includes(option.value) && styles.optionButtonSelected,
                      ]}
                      onPress={() => toggleGenderPreference(option.value)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          interestedIn.includes(option.value) && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.displayValue}>
                  {interestedIn.length > 0 ? GENDER_OPTIONS.filter(o => interestedIn.includes(o.value)).map(o => o.label).join(', ') : 'Not set'}
                </Text>
              )}
            </View>
          </View>

          {/* Looking For - Right */}
          <View style={styles.columnRight}>
            <View style={styles.preferenceSubSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.titleWithIcon}>
                  {!relationshipIntent && <Ionicons name="alert-circle" size={18} color="#F4B400" style={styles.warningIcon} />}
                  <Text style={styles.sectionTitle}>Looking For</Text>
                </View>
                {editMode === 'intent' ? (
                  <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButton}>Save</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setEditMode('intent')}>
                    <Ionicons name="pencil" size={22} color="#378BBB" />
                  </TouchableOpacity>
                )}
              </View>
              
              {editMode === 'intent' ? (
                <View style={styles.optionsGrid}>
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        relationshipIntent === option.value && styles.optionButtonSelected,
                      ]}
                      onPress={() => setRelationshipIntent(option.value)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={relationshipIntent === option.value ? '#FFFFFF' : '#666666'}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          relationshipIntent === option.value && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.displayValue}>
                  {RELATIONSHIP_OPTIONS.find(o => o.value === relationshipIntent)?.label || 'Not set'}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.preferenceDivider} />

        {/* Match Radius (Editable) */}
        <View style={styles.preferenceSubSectionLast}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Match Radius: {matchRadiusKm} km</Text>
            {editMode === 'radius' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('radius')}>
                <Ionicons name="pencil" size={22} color="#378BBB" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'radius' && (
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={100}
              step={1}
              value={matchRadiusKm}
              onValueChange={setMatchRadiusKm}
              minimumTrackTintColor="#378BBB"
              maximumTrackTintColor="#233B57"
              thumbTintColor="#378BBB"
            />
          )}
        </View>
        </View>

        {/* Social Handles (Editable) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithIcon}>
              {!instagram && !linkedin && !facebook && !twitter && <Ionicons name="alert-circle" size={18} color="#F4B400" style={styles.warningIcon} />}
              <Text style={styles.sectionTitle}>Social Handles</Text>
            </View>
            {editMode === 'social' ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditMode('social')}>
                <Ionicons name="pencil" size={22} color="#378BBB" />
              </TouchableOpacity>
            )}
          </View>
          
          {editMode === 'social' ? (
            <View style={styles.socialEditContainer}>
              {/* Row 1: Instagram and Facebook */}
              <View style={styles.twoColumnRow}>
                <View style={styles.columnLeft}>
                  <View style={styles.socialInputRow}>
                    <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                    <TextInput
                      style={styles.socialInput}
                      value={instagram}
                      onChangeText={setInstagram}
                      placeholder="@username"
                      placeholderTextColor="#7F93AA"
                      autoCapitalize="none"
                      maxLength={30}
                    />
                  </View>
                </View>
                <View style={styles.columnRight}>
                  <View style={styles.socialInputRow}>
                    <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                    <TextInput
                      style={styles.socialInput}
                      value={facebook}
                      onChangeText={setFacebook}
                      placeholder="username"
                      placeholderTextColor="#7F93AA"
                      autoCapitalize="none"
                      maxLength={100}
                    />
                  </View>
                </View>
              </View>

              {/* Row 2: LinkedIn and X */}
              <View style={styles.twoColumnRow}>
                <View style={styles.columnLeft}>
                  <View style={styles.socialInputRow}>
                    <Ionicons name="logo-linkedin" size={22} color="#0A66C2" />
                    <TextInput
                      style={styles.socialInput}
                      value={linkedin}
                      onChangeText={setLinkedin}
                      placeholder="username"
                      placeholderTextColor="#7F93AA"
                      autoCapitalize="none"
                      maxLength={100}
                    />
                  </View>
                </View>
                <View style={styles.columnRight}>
                  <View style={styles.socialInputRow}>
                    <Text style={styles.xLogoSmall}>𝕏</Text>
                    <TextInput
                      style={styles.socialInput}
                      value={twitter}
                      onChangeText={setTwitter}
                      placeholder="@username"
                      placeholderTextColor="#7F93AA"
                      autoCapitalize="none"
                      maxLength={30}
                    />
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.socialDisplayContainer}>
              {/* Row 1: Instagram and Facebook */}
              <View style={styles.twoColumnRow}>
                <View style={styles.columnLeft}>
                  {instagram ? (
                    <View style={styles.socialDisplayBox}>
                      <View style={styles.socialDisplayRow}>
                        <Ionicons name="logo-instagram" size={18} color="#E4405F" />
                        <Text style={styles.socialDisplayText}>@{instagram.replace('@', '')}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.socialDisplayBox}>
                      <View style={styles.socialDisplayRow}>
                        <Ionicons name="logo-instagram" size={18} color="#7F93AA" />
                        <Text style={styles.socialDisplayTextEmpty}>Not set</Text>
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.columnRight}>
                  {facebook ? (
                    <View style={styles.socialDisplayBox}>
                      <View style={styles.socialDisplayRow}>
                        <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                        <Text style={styles.socialDisplayText}>{facebook}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.socialDisplayBox}>
                      <View style={styles.socialDisplayRow}>
                        <Ionicons name="logo-facebook" size={18} color="#7F93AA" />
                        <Text style={styles.socialDisplayTextEmpty}>Not set</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Row 2: LinkedIn and X */}
              <View style={styles.twoColumnRow}>
                <View style={styles.columnLeft}>
                  {linkedin ? (
                    <View style={styles.socialDisplayBox}>
                      <View style={styles.socialDisplayRow}>
                        <Ionicons name="logo-linkedin" size={18} color="#0A66C2" />
                        <Text style={styles.socialDisplayText}>{linkedin}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.socialDisplayBox}>
                      <View style={styles.socialDisplayRow}>
                        <Ionicons name="logo-linkedin" size={18} color="#7F93AA" />
                        <Text style={styles.socialDisplayTextEmpty}>Not set</Text>
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.columnRight}>
                  {twitter ? (
                    <View style={styles.socialDisplayBox}>
                      <View style={styles.socialDisplayRow}>
                        <Text style={styles.xLogoDisplay}>𝕏</Text>
                        <Text style={styles.socialDisplayText}>@{twitter.replace('@', '')}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.socialDisplayBox}>
                      <View style={styles.socialDisplayRow}>
                        <Text style={styles.xLogoDisplayGray}>𝕏</Text>
                        <Text style={styles.socialDisplayTextEmpty}>Not set</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </KeyboardAwareScrollView>

    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1621',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E1621',
  },
  errorText: {
    fontSize: 16,
    color: '#7F93AA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#0E1621',
    borderBottomWidth: 2,
    borderBottomColor: '#0E1621',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutButton: {
    padding: 8,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  photoContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    marginBottom: 12,
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'absolute',
    top: 10,
    left: 10,
  },
  completenessChip: {
    backgroundColor: '#1B2F48',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  completenessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#378BBB',
  },
  usernameContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    position: 'relative',
  },
  usernameWrapper: {
    alignItems: 'center',
  },
  usernameText: {
    fontSize: 20,
    color: '#B8C7D9',
    fontWeight: '500',
    textAlign: 'center',
  },
  usernameInput: {
    fontSize: 20,
    color: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#378BBB',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 120,
    textAlign: 'center',
  },
  usernameEditButton: {
    position: 'absolute',
    right: 80,
    top: 0,
    paddingVertical: 4,
  },
  usernameSaveText: {
    fontSize: 14,
    color: '#378BBB',
    fontWeight: '600',
  },
  missingText: {
    fontSize: 12,
    color: '#7F93AA',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldIcon: {
    marginTop: 1,
  },
  fieldWarningIcon: {
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fieldValue: {
    fontSize: 15,
    color: '#B8C7D9',
    marginBottom: 12,
    marginLeft: 20,
  },
  fieldValueBox: {
    backgroundColor: '#1B2F48',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#378BBB',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    marginLeft: 20,
  },
  fieldValueBoxText: {
    fontSize: 15,
    color: '#B8C7D9',
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  columnLeft: {
    flex: 1,
  },
  columnRight: {
    flex: 1,
  },
  fieldInput: {
    fontSize: 16,
    color: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#378BBB',
    paddingBottom: 8,
    marginBottom: 12,
    marginLeft: 26,
  },
  bioFieldInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bioDisplayBox: {
    backgroundColor: '#1B2F48',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#378BBB',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    marginLeft: 20,
    minHeight: 80,
  },
  bioDisplayText: {
    fontSize: 15,
    color: '#B8C7D9',
    lineHeight: 22,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: '#233B57',
    marginVertical: 12,
  },
  settingsIconContainer: {
    position: 'relative',
    zIndex: 1001,
  },
  gearIcon: {
    padding: 8,
  },
  settingsDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#16283D',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#378BBB',
    minWidth: 200,
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 1002,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#233B57',
  },
  section: {
    backgroundColor: '#16283D',
    marginTop: 12,
    marginHorizontal: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 16,
  },
  preferenceSubSection: {
    marginBottom: 20,
  },
  preferenceSubSectionLast: {
    marginBottom: 0,
  },
  preferenceDivider: {
    height: 1,
    backgroundColor: '#233B57',
    marginVertical: 20,
  },
  aboutMeHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#378BBB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningIcon: {
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#378BBB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7F93AA',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  input: {
    borderWidth: 2,
    borderColor: '#233B57',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#1B2F48',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  displayValue: {
    fontSize: 16,
    color: '#B8C7D9',
    lineHeight: 24,
  },
  // Interests Section - Matching Signup Design
  interestCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1B2F48',
    borderRadius: 12,
    marginBottom: 12,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#378BBB',
  },
  minText: {
    fontSize: 14,
    color: '#7F93AA',
  },
  minTextSuccess: {
    color: '#2ECC71',
  },
  selectedChipsScroll: {
    marginBottom: 12,
  },
  selectedChipsContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#378BBB',
  },
  selectedChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoriesScroll: {
    paddingVertical: 16,
    marginBottom: 12,
  },
  categoriesScrollContent: {
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
    marginTop: 8,
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
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#233B57',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#378BBB',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1B2F48',
    borderWidth: 2,
    borderColor: '#233B57',
  },
  interestTagSelected: {
    backgroundColor: '#378BBB',
    borderColor: '#378BBB',
  },
  interestTagText: {
    fontSize: 14,
    color: '#B8C7D9',
  },
  interestTagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  interestsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestDisplayTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1B2F48',
    borderWidth: 1,
    borderColor: '#378BBB',
  },
  interestDisplayTagText: {
    fontSize: 14,
    color: '#B8C7D9',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  interestChipSelected: {
    backgroundColor: '#FF4458',
    borderColor: '#FF4458',
  },
  interestChipText: {
    fontSize: 14,
    color: '#666666',
  },
  interestChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1B2F48',
    borderWidth: 2,
    borderColor: '#233B57',
  },
  optionButtonSelected: {
    backgroundColor: '#378BBB',
    borderColor: '#378BBB',
  },
  optionText: {
    fontSize: 14,
    color: '#B8C7D9',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
  },
  // Location Section - Improved Layout
  locationHeader: {
    marginBottom: 12,
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  locationStatus: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  locationDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4458',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  enableLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Height Edit Styles
  heightInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2F48',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#233B57',
    paddingHorizontal: 14,
  },
  heightIcon: {
    marginRight: 12,
  },
  heightInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  heightUnit: {
    fontSize: 15,
    color: '#B8C7D9',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Social Edit Styles
  socialEditContainer: {
    marginTop: 8,
    gap: 12,
  },
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialInput: {
    flex: 1,
    padding: 14,
    backgroundColor: '#1B2F48',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#233B57',
    fontSize: 15,
    color: '#FFFFFF',
  },
  xLogoSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  socialDisplayContainer: {
    marginTop: 4,
    gap: 12,
  },
  socialDisplayBox: {
    backgroundColor: '#1B2F48',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#378BBB',
    padding: 14,
    minHeight: 52,
    justifyContent: 'center',
  },
  socialDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialDisplayText: {
    fontSize: 15,
    color: '#B8C7D9',
    flex: 1,
  },
  socialDisplayTextEmpty: {
    fontSize: 15,
    color: '#7F93AA',
    flex: 1,
  },
  xLogoDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  xLogoDisplayGray: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F93AA',
  },
  // Occupation autocomplete styles - inline list (not absolute positioned)
  suggestionsList: {
    marginTop: 8,
    backgroundColor: '#16283D',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#233B57',
    overflow: 'hidden',
  },
  suggestionItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#233B57',
    backgroundColor: '#16283D',
  },
  suggestionTextInline: {
    fontSize: 15,
    color: '#FFFFFF',
  },
});

export default ProfileScreen;

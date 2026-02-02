/**
 * Dating Preferences Screen
 * 
 * Final profile setup screen where users set:
 * - Bio (about me)
 * - Height
 * - Occupation
 * - Relationship intent (what they're looking for)
 * - Interested in (gender preferences)
 * - Match radius (distance)
 * - Social handles (Instagram, LinkedIn, Facebook, X)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  PermissionsAndroid,
  Platform,
  Alert,
  Modal,
  FlatList,
  ScrollView,
  PanResponder,
  Animated,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { SocialHandles } from '../../types/database';
import notificationService from '../../services/NotificationService';
import Geolocation from '@react-native-community/geolocation';

interface DatingPreferencesScreenProps {
  navigation: any;
}

type RelationshipIntent = 'casual' | 'long_term' | 'hookups' | 'friendship' | 'unsure';
type Gender = 'male' | 'female' | 'trans' | 'non_binary';

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

const RELATIONSHIP_OPTIONS: { value: RelationshipIntent; label: string; icon: string; description: string }[] = [
  { value: 'long_term', label: 'Long-term', icon: 'heart', description: 'Looking for a relationship' },
  { value: 'casual', label: 'Casual', icon: 'cafe', description: 'Something relaxed' },
  { value: 'friendship', label: 'Friendship', icon: 'people', description: 'New friends' },
  { value: 'hookups', label: 'Hookups', icon: 'flame', description: 'Keeping it casual' },
  { value: 'unsure', label: 'Unsure', icon: 'help-circle', description: 'Still figuring it out' },
];

const GENDER_OPTIONS: { value: Gender; label: string; icon: string }[] = [
  { value: 'male', label: 'Men', icon: 'male' },
  { value: 'female', label: 'Women', icon: 'female' },
  { value: 'trans', label: 'Trans', icon: 'transgender' },
  { value: 'non_binary', label: 'Non-binary', icon: 'male-female' },
];

// Common occupations for autocomplete suggestions
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

// Circular Slider Component
const CircularSlider: React.FC<{
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step: number;
}> = ({ value, onValueChange, minimumValue, maximumValue, step }) => {
  const [inputText, setInputText] = useState(value.toString());
  const circleSize = 260;
  const circleRadius = 110;
  const centerX = circleSize / 2;
  const centerY = circleSize / 2;
  const strokeWidth = 12;
  const minTouchRadius = 50; // Ignore touches closer than this to center

  // Update inputText when value changes from slider drag
  React.useEffect(() => {
    setInputText(value.toString());
  }, [value]);

  const handleInputChange = (text: string) => {
    // Allow empty or numbers only
    const cleaned = text.replace(/[^0-9]/g, '');
    setInputText(cleaned);
    
    // Update slider if valid number
    if (cleaned !== '') {
      const numValue = parseInt(cleaned);
      if (!isNaN(numValue) && numValue >= minimumValue && numValue <= maximumValue) {
        onValueChange(numValue);
      }
    }
  };

  const handleInputBlur = () => {
    // On blur, ensure we have a valid value
    if (inputText === '' || parseInt(inputText) < minimumValue) {
      setInputText(minimumValue.toString());
      onValueChange(minimumValue);
    } else if (parseInt(inputText) > maximumValue) {
      setInputText(maximumValue.toString());
      onValueChange(maximumValue);
    } else {
      const numValue = parseInt(inputText);
      setInputText(numValue.toString());
      onValueChange(numValue);
    }
  };

  const circumference = 2 * Math.PI * circleRadius;
  const arcAngle = 270; // 3/4 circle
  const arcLength = (arcAngle / 360) * circumference;
  const startAngle = 135; // Start from bottom-left, go clockwise

  // Calculate progress (0 to 1)
  const progress = (value - minimumValue) / (maximumValue - minimumValue);
  const progressArcLength = arcLength * progress;

  // Calculate handle position
  // startAngle is 135 degrees, we move clockwise by progress * 270 degrees
  const handleAngle = startAngle + (progress * arcAngle);
  const handleAngleRad = (handleAngle * Math.PI) / 180;
  const handleX = centerX + circleRadius * Math.cos(handleAngleRad);
  const handleY = centerY + circleRadius * Math.sin(handleAngleRad);

  // PanResponder for dragging
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const dx = locationX - centerX;
      const dy = locationY - centerY;
      
      // Ignore touches too close to center
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      if (distanceFromCenter < minTouchRadius) {
        return;
      }
      
      // Calculate angle in degrees (0 = right, 90 = down, etc.)
      let touchAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (touchAngle < 0) touchAngle += 360; // Normalize to 0-360
      
      // Convert touch angle to progress
      // Our arc goes from 135 to 405 (135 + 270), which wraps to 45
      let relativeAngle = touchAngle - startAngle;
      if (relativeAngle < 0) relativeAngle += 360;
      
      // Check if touch is within the arc range (0 to 270 degrees from start)
      if (relativeAngle <= arcAngle) {
        const newProgress = relativeAngle / arcAngle;
        const range = maximumValue - minimumValue;
        const rawValue = minimumValue + (newProgress * range);
        const clampedValue = Math.max(minimumValue, Math.min(maximumValue, Math.round(rawValue)));
        onValueChange(clampedValue);
      } else if (relativeAngle > arcAngle && relativeAngle < arcAngle + 45) {
        // Past the end - snap to max
        onValueChange(maximumValue);
      } else if (relativeAngle > 315) {
        // Before the start - snap to min
        onValueChange(minimumValue);
      }
    },
  });

  return (
    <View style={styles.circularSliderContainer}>
      <View {...panResponder.panHandlers} style={styles.circularSliderTouchArea}>
        <Svg width={circleSize} height={circleSize}>
          {/* Background arc (gray track) */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={circleRadius}
            stroke="#233B57"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            rotation={startAngle}
            origin={`${centerX}, ${centerY}`}
          />
          
          {/* Progress arc (blue fill) */}
          {progressArcLength > 0 && (
            <Circle
              cx={centerX}
              cy={centerY}
              r={circleRadius}
              stroke="#378BBB"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progressArcLength} ${circumference}`}
              strokeLinecap="round"
              rotation={startAngle}
              origin={`${centerX}, ${centerY}`}
            />
          )}
          
          {/* Handle */}
          <Circle
            cx={handleX}
            cy={handleY}
            r={14}
            fill="#378BBB"
            stroke="#FFFFFF"
            strokeWidth={3}
          />
        </Svg>
        
        {/* Center text - editable */}
        <View style={styles.circularSliderCenter}>
          <TextInput
            style={styles.circularSliderValueInput}
            value={inputText}
            onChangeText={handleInputChange}
            onBlur={handleInputBlur}
            keyboardType="numeric"
            maxLength={3}
            selectTextOnFocus
          />
          <Text style={styles.circularSliderUnit}>km</Text>
        </View>
      </View>
    </View>
  );
};

// Glowing TextArea component - manages its own focus state
const GlowingTextArea: React.FC<{
  style: any;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  maxLength?: number;
}> = ({ style, value, onChangeText, placeholder, maxLength }) => {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[
        style,
        focused && {
          borderColor: '#378BBB',
          shadowColor: '#378BBB',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
      placeholder={placeholder}
      placeholderTextColor="#7F93AA"
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      multiline
      maxLength={maxLength}
      textAlignVertical="top"
    />
  );
};

// Glowing Input Wrapper - wraps an input row with icon
const GlowingInputRow: React.FC<{
  wrapperStyle: any;
  icon: string;
  iconColor?: string;
  children: React.ReactNode;
}> = ({ wrapperStyle, icon, iconColor = '#378BBB', children }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        wrapperStyle,
        focused && {
          borderColor: '#378BBB',
          shadowColor: '#378BBB',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
      onTouchStart={() => setFocused(true)}
    >
      <Ionicons name={icon as any} size={22} color={iconColor} style={{ marginRight: 12 }} />
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, {
              onFocus: () => setFocused(true),
              onBlur: () => setFocused(false),
            })
          : child
      )}
    </View>
  );
};

// Simple glowing input for social handles
const GlowingSocialInput: React.FC<{
  style: any;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  maxLength?: number;
}> = ({ style, value, onChangeText, placeholder, maxLength }) => {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[
        style,
        focused && {
          borderColor: '#378BBB',
          shadowColor: '#378BBB',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
      placeholder={placeholder}
      placeholderTextColor="#7F93AA"
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      autoCapitalize="none"
      maxLength={maxLength}
    />
  );
};

const DatingPreferencesScreen: React.FC<DatingPreferencesScreenProps> = ({ navigation }) => {
  const [bio, setBio] = useState('');
  const [height, setHeight] = useState<number | null>(null);
  const [heightDisplayUnit, setHeightDisplayUnit] = useState<'cm' | 'ft'>('ft');
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [showOccupationSuggestions, setShowOccupationSuggestions] = useState(false);
  const [filteredOccupations, setFilteredOccupations] = useState<string[]>([]);
  const [relationshipIntent, setRelationshipIntent] = useState<RelationshipIntent | null>(null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [matchRadiusKm, setMatchRadiusKm] = useState(25);
  
  // Social handles
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  /**
   * Handle occupation input change with autocomplete
   */
  const handleOccupationChange = (text: string) => {
    setOccupation(text);
    if (text.length >= 2) {
      const filtered = OCCUPATION_SUGGESTIONS.filter(occ => 
        occ.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredOccupations(filtered.slice(0, 5));
      setShowOccupationSuggestions(filtered.length > 0);
    } else {
      setShowOccupationSuggestions(false);
    }
  };

  /**
   * Convert cm to feet/inches string
   */
  const cmToFeetInches = (cm: number): string => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  /**
   * Get height display string
   */
  const getHeightDisplay = (): string => {
    if (!height) return '';
    return `${height}`;
  };

  /**
   * Request location permission
   */
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
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
        const permitted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermissionGranted(permitted);
        return permitted;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  /**
   * Get current location coordinates (with short timeout for better UX)
   */
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Location error (non-blocking):', error.message);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 } // Lower accuracy, faster response
      );
    });
  };

  const handleToggleGender = (gender: Gender) => {
    if (interestedIn.includes(gender)) {
      setInterestedIn(prev => prev.filter(g => g !== gender));
    } else {
      setInterestedIn(prev => [...prev, gender]);
    }
  };

  /**
   * Skip dating preferences - creates empty preference fields
   */
  const handleSkip = async () => {
    setSaving(true);

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Save empty preferences (for profile completion tracking)
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          bio: '',
          relationshipIntent: null,
          interestedIn: [],
          matchRadiusKm: 25, // Default value
        });

      // Update signupStep to complete
      await firestore()
        .collection('accounts')
        .doc(userId)
        .update({
          signupStep: 'complete',
          status: 'active',
        });

      console.log('✅ Dating preferences skipped - signup complete');

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });

    } catch (error: any) {
      console.error('❌ Error skipping preferences:', error);
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

  const handleComplete = async () => {
    // Validation - Bio is optional, but if user writes something, enforce minimum
    if (bio.trim().length > 0 && bio.trim().length < 20) {
      Toast.show({
        type: 'error',
        text1: 'Bio Too Short',
        text2: 'Please write at least 20 characters about yourself',
        visibilityTime: 3000,
      });
      return;
    }

    if (bio.trim().length > 500) {
      Toast.show({
        type: 'error',
        text1: 'Bio Too Long',
        text2: 'Please keep your bio under 500 characters',
        visibilityTime: 3000,
      });
      return;
    }

    // All other fields are optional - no validation needed

    setSaving(true);

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Build social handles object (null if all empty)
      const socialHandles: SocialHandles | null = (instagram || linkedin || facebook || twitter) ? {
        instagram: instagram.trim() || null,
        linkedin: linkedin.trim() || null,
        facebook: facebook.trim() || null,
        twitter: twitter.trim() || null,
      } : null;

      // Build height object (null if not selected)
      const heightData = height ? {
        value: height,
        displayUnit: heightDisplayUnit,
      } : null;

      // Save dating preferences immediately (don't wait for location)
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          bio: bio.trim() || null,
          height: heightData,
          occupation: occupation.trim() || null,
          socialHandles,
          relationshipIntent: relationshipIntent || null,
          interestedIn,
          matchRadiusKm,
        });

      console.log('✅ Dating preferences saved');

      // Update signupStep to complete
      await firestore()
        .collection('accounts')
        .doc(userId)
        .update({
          signupStep: 'complete',
          status: 'active',
        });

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });

    } catch (error: any) {
      console.error('❌ Error saving preferences:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: error.message || 'Could not save preferences. Please try again.',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const bioCharCount = bio.length;
  // Bio is valid if empty OR has 20+ characters
  const bioValid = bioCharCount === 0 || (bioCharCount >= 20 && bioCharCount <= 500);
  // Show invalid state only when user has started typing but hasn't reached minimum
  const bioShowInvalid = bioCharCount > 0 && bioCharCount < 20;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={100}
        extraHeight={150}
        keyboardOpeningTime={0}
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={styles.title}>Almost Done!</Text>
            <Text style={styles.subtitle}>Complete your dating profile</Text>
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

        {/* About Me */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.sectionSubtitle}>Tell others what makes you unique</Text>
          
          <View style={styles.textAreaContainer}>
            <GlowingTextArea
              style={styles.textArea}
              placeholder="I love hiking, trying new restaurants, and binge-watching sci-fi shows..."
              value={bio}
              onChangeText={setBio}
              maxLength={500}
            />
            <Text style={[
              styles.charCount,
              bioCharCount >= 20 ? styles.charCountValid : (bioShowInvalid ? styles.charCountInvalid : {})
            ]}>
              {bioCharCount}/500 {bioCharCount === 0 ? '(optional)' : (bioCharCount >= 20 ? '✓' : `(min 20)`)}
            </Text>
          </View>
        </View>

        {/* Height */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Height</Text>
          <Text style={styles.sectionSubtitle}>Optional but helps with matching</Text>
          
          <GlowingInputRow wrapperStyle={styles.heightInputWrapper} icon="body-outline">
            <TextInput
              style={styles.heightInput}
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
            />
            <Text style={styles.heightUnit}>cm</Text>
          </GlowingInputRow>
        </View>

        {/* Occupation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Occupation</Text>
          <Text style={styles.sectionSubtitle}>What do you do?</Text>
          
          <View>
            <GlowingInputRow wrapperStyle={styles.occupationInputWrapper} icon="briefcase-outline">
              <TextInput
                style={styles.occupationInput}
                placeholder="e.g., Software Engineer, Doctor...."
                placeholderTextColor="#7F93AA"
                value={occupation}
                onChangeText={handleOccupationChange}
                maxLength={50}
              />
            </GlowingInputRow>
            
            {/* Suggestions as inline list below input */}
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
        </View>

        {/* Looking For */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Looking For</Text>
          <Text style={styles.sectionSubtitle}>What are you looking for?</Text>
          
          <View style={styles.optionsContainer}>
            {RELATIONSHIP_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.relationshipCard,
                  relationshipIntent === option.value && styles.relationshipCardSelected,
                ]}
                onPress={() => setRelationshipIntent(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon as any}
                  size={28}
                  color={relationshipIntent === option.value ? '#378BBB' : '#FF4D6D'}
                />
                <Text
                  style={[
                    styles.relationshipLabel,
                    relationshipIntent === option.value && styles.relationshipLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.relationshipDescription,
                    relationshipIntent === option.value && styles.relationshipDescriptionSelected,
                  ]}
                  numberOfLines={2}
                >
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Interested In */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interested In</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genderContainer}
            style={styles.genderScrollView}
          >
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderChip,
                  interestedIn.includes(option.value) && styles.genderChipSelected,
                ]}
                onPress={() => handleToggleGender(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon as any}
                  size={22}
                  color={interestedIn.includes(option.value) ? '#FFFFFF' : '#378BBB'}
                />
                <Text
                  style={[
                    styles.genderLabel,
                    interestedIn.includes(option.value) && styles.genderLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                {interestedIn.includes(option.value) && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Match Radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Radius</Text>
          <Text style={styles.sectionSubtitle}>How far should we look?</Text>
          
          <CircularSlider
            value={matchRadiusKm}
            onValueChange={setMatchRadiusKm}
            minimumValue={1}
            maximumValue={100}
            step={1}
          />
          
          <View style={styles.radiusRangeLabels}>
            <Text style={styles.radiusRangeLabel}>1 km</Text>
            <Text style={styles.radiusRangeLabel}>100 km</Text>
          </View>
        </View>

        {/* Social Handles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Handles</Text>
          <Text style={styles.sectionSubtitle}>Help others connect with you (optional)</Text>
          
          <View style={styles.socialHandlesContainer}>
            {/* Instagram */}
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconWrapper, { backgroundColor: '#E4405F' }]}>
                <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
              </View>
              <GlowingSocialInput
                style={styles.socialInput}
                placeholder="@username"
                value={instagram}
                onChangeText={setInstagram}
                maxLength={30}
              />
            </View>

            {/* LinkedIn */}
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconWrapper, { backgroundColor: '#0A66C2' }]}>
                <Ionicons name="logo-linkedin" size={18} color="#FFFFFF" />
              </View>
              <GlowingSocialInput
                style={styles.socialInput}
                placeholder="Profile URL or username"
                value={linkedin}
                onChangeText={setLinkedin}
                maxLength={100}
              />
            </View>

            {/* Facebook */}
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconWrapper, { backgroundColor: '#1877F2' }]}>
                <Ionicons name="logo-facebook" size={18} color="#FFFFFF" />
              </View>
              <GlowingSocialInput
                style={styles.socialInput}
                placeholder="Profile URL or username"
                value={facebook}
                onChangeText={setFacebook}
                maxLength={100}
              />
            </View>

            {/* X (Twitter) */}
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconWrapper, { backgroundColor: '#000000' }]}>
                <Text style={styles.xLogo}>𝕏</Text>
              </View>
              <GlowingSocialInput
                style={styles.socialInput}
                placeholder="@username"
                value={twitter}
                onChangeText={setTwitter}
                maxLength={30}
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>

      {/* Complete Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleComplete}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.completeButtonText}>
            {saving ? 'Completing...' : 'Complete Profile'}
          </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#B8C7D9',
    marginBottom: 16,
  },
  textAreaContainer: {
    position: 'relative',
  },
  textArea: {
    backgroundColor: '#1B2F48',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 120,
    borderWidth: 2,
    borderColor: '#233B57',
  },
  charCount: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 12,
    color: '#7F93AA',
    fontWeight: '600',
  },
  charCountValid: {
    color: '#2ECC71',
  },
  charCountInvalid: {
    color: '#FF4D6D',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  relationshipCard: {
    backgroundColor: '#16283D',
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: '#233B57',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    width: '30%',
    minHeight: 110,
  },
  relationshipCardSelected: {
    backgroundColor: '#16283D',
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  relationshipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  relationshipLabelSelected: {
    color: '#378BBB',
  },
  relationshipDescription: {
    fontSize: 12,
    color: '#7F93AA',
    textAlign: 'center',
  },
  relationshipDescriptionSelected: {
    color: '#B8C7D9',
    opacity: 1,
  },
  genderScrollView: {
    marginHorizontal: -20, // Extend to screen edges
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingRight: 80, // Add padding to show partial 4th chip
  },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16283D',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#233B57',
    gap: 6,
  },
  genderChipSelected: {
    backgroundColor: '#16283D',
    borderColor: '#378BBB',
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  genderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  genderLabelSelected: {
    color: '#FFFFFF',
  },
  circularSliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  circularSliderTouchArea: {
    position: 'relative',
  },
  circularSliderCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularSliderValueInput: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 80,
    padding: 0,
  },
  circularSliderValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  circularSliderUnit: {
    fontSize: 16,
    color: '#B8C7D9',
    fontWeight: '600',
    marginTop: 4,
  },
  radiusRangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  radiusRangeLabel: {
    fontSize: 13,
    color: '#7F93AA',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#0E1621',
    borderTopWidth: 1,
    borderTopColor: '#233B57',
  },
  completeButton: {
    backgroundColor: '#378BBB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#378BBB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  completeButtonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Height styles
  heightInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2F48',
    borderRadius: 14,
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

  // Occupation styles
  occupationContainer: {
    position: 'relative',
  },
  occupationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2F48',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#233B57',
    paddingHorizontal: 14,
  },
  occupationIcon: {
    marginRight: 12,
  },
  occupationInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    zIndex: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  // Inline suggestions list (not absolute positioned - always clickable)
  suggestionsList: {
    marginTop: 8,
    backgroundColor: '#16283D',
    borderRadius: 14,
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

  // Social handles styles
  socialHandlesContainer: {
    gap: 12,
  },
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialInput: {
    flex: 1,
    backgroundColor: '#1B2F48',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#233B57',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  xLogo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default DatingPreferencesScreen;

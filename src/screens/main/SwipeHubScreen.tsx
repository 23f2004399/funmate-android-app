/**
 * SWIPE HUB SCREEN (Main Homepage)
 * 
 * Where users see and swipe on potential matches
 * - Card-based interface with Tinder-style swipes
 * - Match scoring algorithm
 * - Photo slideshow on each card
 * - Swipe actions: like (right), pass (left)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  PermissionsAndroid,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CardSwiper from '../../components/CardSwiper';
import MatchAnimation from '../../components/MatchAnimation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Geolocation from '@react-native-community/geolocation';
import { getBlockedUserIds } from '../../utils/blockCache';
import { calculateMatchScore, calculateDistance, passesFilters } from '../../utils/RecomendationEngine';
import { calculateProfileCompleteness } from '../../utils/profileCompleteness';
import notificationService from '../../services/NotificationService';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = height * 0.65;

interface Match {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  interests: string[];
  relationshipIntent: string | null;
  interestedIn?: string[];
  isVerified?: boolean;
  photos: Array<{
    url: string;
    isPrimary: boolean;
    moderationStatus: string;
    order: number;
    uploadedAt: string;
  }>;
  location?: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  matchScore: number;
  lastActiveAt?: any;
}

// Match data for animation (mutual match)
interface MatchAnimationData {
  matchId: string;
  chatId: string;
  matchedUser: Match;
}

const SwipeHubScreen = () => {
  const navigation = useNavigation<any>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  
  // Match animation state (for mutual matches)
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchAnimationData, setMatchAnimationData] = useState<MatchAnimationData | null>(null);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string>('');
  const [expandedSocial, setExpandedSocial] = useState<string | null>(null);
  const showMatchAnimationRef = useRef(false); // Ref for synchronous access to prevent empty state flicker
  
  const userId = auth().currentUser?.uid;
  const isFocused = useIsFocused();
  const hasRequestedPermission = useRef(false);
  const appState = useRef(AppState.currentState);
  const scrollViewRef = useRef<ScrollView>(null);

  // Get current match for detail view (always first since we filter out swiped cards)
  const currentMatch = matches[0];

  /**
   * Update location in Firestore (only if permission granted)
   */
  const updateLocationIfAllowed = async () => {
    if (!userId) return;
    
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (!hasPermission) {
          console.log('📍 No permission, skipping location update');
          return;
        }
      }
      
      Geolocation.getCurrentPosition(
        async (position) => {
          try {
            await firestore().collection('users').doc(userId).update({
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
              lastActiveAt: firestore.FieldValue.serverTimestamp(),
            });
            console.log('📍 Location updated successfully');
          } catch (error) {
            console.error('Error saving location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        }
      );
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  /**
   * Request location permission - ONLY called once on initial mount
   */
  const requestLocationPermission = async () => {
    if (!userId) return;
    if (hasRequestedPermission.current) return; // Already requested this session
    
    try {
      if (Platform.OS === 'android') {
        // First check if already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (hasPermission) {
          console.log('📍 Permission already granted');
          await updateLocationIfAllowed();
          return;
        }
        
        // Mark as requested so we don't ask again this session
        hasRequestedPermission.current = true;
        
        // Request permission - this shows native dialog ONLY if user hasn't denied before
        console.log('📍 Requesting location permission');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('📍 Permission granted by user');
          setShowLocationBanner(false);
          await updateLocationIfAllowed();
          
          Toast.show({
            type: 'success',
            text1: 'Location Enabled',
            text2: 'Finding better matches near you!',
            visibilityTime: 2000,
          });
        } else {
          // User denied - show banner
          console.log('📍 Permission denied by user');
          setShowLocationBanner(true);
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  /**
   * Handle Enable button press on banner - opens app permissions page
   */
  const handleEnableLocation = async () => {
    try {
      if (Platform.OS === 'android') {
        // Open the app's permissions page directly
        await Linking.sendIntent('android.settings.action.MANAGE_APP_PERMISSIONS', [
          { key: 'android.intent.extra.PACKAGE_NAME', value: 'com.funmateapp' }
        ]);
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      // Fallback to openSettings
      try {
        await Linking.openSettings();
      } catch (fallbackError) {
        console.error('Error opening settings:', fallbackError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Could not open settings',
          visibilityTime: 2000,
        });
      }
    }
  };

  /**
   * Dismiss the location banner
   */
  const dismissLocationBanner = () => {
    setShowLocationBanner(false);
  };

  /**
   * Initial load - request permissions and fetch matches
   */
  useEffect(() => {
    const init = async () => {
      if (!userId) return;
      await requestLocationPermission();
      // Initialize notification service (requests permission if needed)
      await notificationService.initialize();
      await fetchMatches();
    };
    init();
  }, [userId]);

  /**
   * Re-fetch matches when screen gains focus (fixes swiped cards reappearing)
   * This ensures we always have fresh data when returning from other screens
   */
  useEffect(() => {
    if (isFocused && !loading && userId) {
      // Don't fetch if we're showing match animation
      if (!showMatchAnimationRef.current) {
        fetchMatches();
      }
    }
  }, [isFocused]);

  /**
   * Ensure ref is synced when matches becomes empty
   */
  useEffect(() => {
    if (matches.length === 0 && !showMatchAnimation) {
      showMatchAnimationRef.current = false;
      // Force component update when matches become empty
      console.log('📭 No more matches - showing empty state');
    }
  }, [matches.length, showMatchAnimation]);

  // Debug: Log when matches changes
  useEffect(() => {
    console.log(`🃏 Matches count: ${matches.length}`);
  }, [matches.length]);

  /**
   * Fetch current user's photo for match animation
   */
  useEffect(() => {
    const fetchCurrentUserPhoto = async () => {
      if (!userId) return;
      
      try {
        const userDoc = await firestore().collection('users').doc(userId).get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const primaryPhoto = userData?.photos?.find((p: any) => p.isPrimary)?.url;
          const firstPhoto = userData?.photos?.[0]?.url;
          setCurrentUserPhoto(primaryPhoto || firstPhoto || '');
        }
      } catch (error) {
        console.error('Error fetching current user photo:', error);
      }
    };
    
    fetchCurrentUserPhoto();
  }, [userId]);

  /**
   * On tab focus or loading complete - check permission status and show/hide banner accordingly
   */
  useEffect(() => {
    const checkPermissionAndUpdate = async () => {
      if (!isFocused || loading) return;
      
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (hasPermission) {
          // Permission granted - hide banner and update location
          if (showLocationBanner) {
            setShowLocationBanner(false);
            Toast.show({
              type: 'success',
              text1: 'Location Enabled',
              text2: 'Finding better matches near you!',
              visibilityTime: 2000,
            });
          }
          await updateLocationIfAllowed();
        } else {
          // Permission not granted - show banner again
          setShowLocationBanner(true);
        }
      }
      
      fetchMatches();
    };
    
    checkPermissionAndUpdate();
  }, [isFocused, loading]);

  /**
   * Listen for app returning to foreground (from Settings)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isFocused
      ) {
        // App came to foreground - check if permission was granted
        if (Platform.OS === 'android') {
          const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          
          if (hasPermission && showLocationBanner) {
            setShowLocationBanner(false);
            await updateLocationIfAllowed();
            fetchMatches();
            
            Toast.show({
              type: 'success',
              text1: 'Location Enabled',
              text2: 'Finding better matches near you!',
              visibilityTime: 2000,
            });
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isFocused, showLocationBanner]);

  /**
   * Fetch potential matches (extracted for reuse)
   */
  const fetchMatches = async () => {
    if (!userId) return;
    try {
      // Get current user data
      const currentUserDoc = await firestore().collection('users').doc(userId).get();
      const currentUserData = currentUserDoc.data();
      
      if (!currentUserData) {
        setLoading(false);
        return;
      }

        console.log('🔍 Current user data:', {
          uid: userId,
          accountType: currentUserData.accountType,
          hasInterests: currentUserData.interests?.length || 0,
          hasRelationshipIntent: !!currentUserData.relationshipIntent,
          hasInterestedIn: currentUserData.interestedIn?.length || 0,
        });

        // Get blocked user IDs (cached for 5 minutes)
        const blockedUserIds = await getBlockedUserIds(userId);

        console.log('🚫 Blocked users:', blockedUserIds.length);

        // Get already swiped user IDs
        const swipedDocs = await firestore()
          .collection('swipes')
          .where('fromUserId', '==', userId)
          .get();
        
        const swipedUserIds = swipedDocs.docs.map(doc => doc.data().toUserId);

        // Get users who liked us and we already acted on (from "Who Liked You")
        // These should NOT appear in SwipeHub since we already handled them
        const actedOnLikesQuery = await firestore()
          .collection('swipes')
          .where('toUserId', '==', userId)
          .where('action', '==', 'like')
          .where('actedOnByTarget', '==', true)
          .get();
        
        const actedOnLikerIds = actedOnLikesQuery.docs.map(doc => doc.data().fromUserId);

        // Check if user has filled ANY preferences
        const hasFilledPreferences = 
          (currentUserData.interests && currentUserData.interests.length > 0) ||
          currentUserData.relationshipIntent;

        // Check if user has selected gender preference
        const hasGenderPreference = 
          currentUserData.interestedIn && currentUserData.interestedIn.length > 0;

        // Fetch all users (we'll filter client-side for now)
        const usersSnapshot = await firestore()
          .collection('users')
          .limit(50)
          .get();

        console.log('📊 Query results:', {
          totalUsers: usersSnapshot.size,
          swipedCount: swipedUserIds.length,
          actedOnLikersCount: actedOnLikerIds.length,
        });

        const potentialMatches: Match[] = [];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const matchUserId = doc.id;

          // Skip self, blocked users, already swiped users, and users we already acted on in "Who Liked You"
          if (
            matchUserId === userId || 
            blockedUserIds.includes(matchUserId) ||
            swipedUserIds.includes(matchUserId) ||
            actedOnLikerIds.includes(matchUserId)
          ) {
            return;
          }

          // Calculate distance (null if either user has no location)
          let distance: number | null = null;
          if (currentUserData.location && userData.location) {
            distance = calculateDistance(
              currentUserData.location.latitude,
              currentUserData.location.longitude,
              userData.location.latitude,
              userData.location.longitude
            );
          }

          // ALWAYS calculate match score using RecommendationEngine
          const matchScore = calculateMatchScore(
            {
              location: currentUserData.location,
              matchRadiusKm: currentUserData.matchRadiusKm || 25,
              relationshipIntent: currentUserData.relationshipIntent,
              interests: currentUserData.interests || [],
              lastActiveAt: currentUserData.lastActiveAt,
            },
            {
              location: userData.location,
              matchRadiusKm: userData.matchRadiusKm,
              relationshipIntent: userData.relationshipIntent,
              interests: userData.interests || [],
              lastActiveAt: userData.lastActiveAt,
            },
            distance
          );

          // If user hasn't filled ANY preferences, show cards without filtering
          if (!hasFilledPreferences) {
            potentialMatches.push({
              id: matchUserId,
              name: userData.name || 'Unknown',
              age: userData.age || 25,
              gender: userData.gender,
              bio: userData.bio || '',
              interests: userData.interests || [],
              relationshipIntent: userData.relationshipIntent,
              photos: userData.photos || [],
              location: userData.location,
              distance: distance !== null ? Math.round(distance) : 0,
              matchScore, // Use calculated score
              lastActiveAt: userData.lastActiveAt,
              height: userData.height,
              occupation: userData.occupation,
              socialHandles: userData.socialHandles,
            });
            return;
          }

          // If user has preferences but NO gender preference, skip gender filtering
          // but still apply other filters (radius, intent)
          if (hasFilledPreferences && !hasGenderPreference) {
            // Apply filters WITHOUT gender check
            const passes = passesFilters(
              {
                interestedIn: [], // Empty array = show all genders
                relationshipIntent: currentUserData.relationshipIntent,
              },
              {
                gender: userData.gender,
                relationshipIntent: userData.relationshipIntent,
              }
            );

            if (!passes) return;

            potentialMatches.push({
              id: matchUserId,
              name: userData.name || 'Unknown',
              age: userData.age || 25,
              gender: userData.gender,
              bio: userData.bio || '',
              interests: userData.interests || [],
              relationshipIntent: userData.relationshipIntent,
              photos: userData.photos || [],
              location: userData.location,
              distance: distance !== null ? Math.round(distance) : 0,
              matchScore,
              lastActiveAt: userData.lastActiveAt,
              height: userData.height,
              occupation: userData.occupation,
              socialHandles: userData.socialHandles,
            });
            return;
          }

          // If user has full preferences (including gender), apply all filters
          const passes = passesFilters(
            {
              interestedIn: currentUserData.interestedIn || [],
              relationshipIntent: currentUserData.relationshipIntent,
            },
            {
              gender: userData.gender,
              relationshipIntent: userData.relationshipIntent,
            }
          );

          if (!passes) return;

          potentialMatches.push({
            id: matchUserId,
            name: userData.name || 'Unknown',
            age: userData.age || 25,
            gender: userData.gender,
            bio: userData.bio || '',
            interests: userData.interests || [],
            relationshipIntent: userData.relationshipIntent,
            interestedIn: userData.interestedIn || [],
            isVerified: userData.isVerified || false,
            photos: userData.photos || [],
            location: userData.location,
            distance: distance !== null ? Math.round(distance) : 0,
            matchScore,
            lastActiveAt: userData.lastActiveAt,
            height: userData.height,
            occupation: userData.occupation,
            socialHandles: userData.socialHandles,
          });
        });
        console.log('✅ Potential matches found:', {
          total: potentialMatches.length,
          hasPreferences: hasFilledPreferences,
          hasGenderPref: hasGenderPreference,
        });
        // Sort by match score (highest first) if user has preferences
        // Otherwise shuffle randomly for users without preferences
        if (hasFilledPreferences) {
          potentialMatches.sort((a, b) => b.matchScore - a.matchScore);
        } else {
          // Shuffle array randomly (Fisher-Yates algorithm)
          for (let i = potentialMatches.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [potentialMatches[i], potentialMatches[j]] = [potentialMatches[j], potentialMatches[i]];
          }
        }

        setMatches(potentialMatches);
        setLoading(false);
        setRefreshing(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
      setRefreshing(false);
      Toast.show({
        type: 'error',
        text1: 'Failed to Load Matches',
        text2: 'Please try again',
        visibilityTime: 3000,
      });
    }
  };

  /**
   * Pull to refresh handler
   */
  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPhotoIndex(0);
    await fetchMatches();
    setRefreshing(false);
  };

  /**
   * Handle swipe right (like)
   * Checks if the other user already liked us - if so, it's a mutual match!
   */
  const handleSwipeRight = async (cardIndex: number) => {
    const match = matches[cardIndex];
    if (!match || !userId) return;

    try {
      // Check if this user has already liked us (mutual match!)
      const existingLikeQuery = await firestore()
        .collection('swipes')
        .where('fromUserId', '==', match.id)
        .where('toUserId', '==', userId)
        .where('action', '==', 'like')
        .where('actedOnByTarget', '==', false)
        .limit(1)
        .get();

      const isMutualMatch = !existingLikeQuery.empty;
      const existingLikeDoc = isMutualMatch ? existingLikeQuery.docs[0] : null;

      // Set ref BEFORE any async work to prevent empty state flicker
      if (isMutualMatch) {
        showMatchAnimationRef.current = true;
      }

      // Save our swipe to Firestore
      // If it's a mutual match, mark as already acted on (they already swiped on us)
      await firestore().collection('swipes').add({
        fromUserId: userId,
        toUserId: match.id,
        action: 'like',
        actedOnByTarget: isMutualMatch, // true if mutual, false otherwise
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      if (isMutualMatch && existingLikeDoc) {
        // 🎉 It's a mutual match! Create match and chat
        console.log(`💕 Mutual match with ${match.name}!`);

        // Create the match document (using userA/userB to match Firestore rules)
        const matchRef = await firestore().collection('matches').add({
          userA: userId,
          userB: match.id,
          isActive: true,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        // Check if chat already exists between these users
        const existingChats = await firestore()
          .collection('chats')
          .where('participants', 'array-contains', userId)
          .get();
        
        const existingChat = existingChats.docs.find(doc => {
          const data = doc.data();
          return data.participants.includes(match.id);
        });

        let chatRef: { id: string };
        
        if (existingChat) {
          // Update existing chat to be mutual
          await existingChat.ref.update({
            isMutual: true,
            relatedMatchId: matchRef.id,
            lastMessageAt: firestore.FieldValue.serverTimestamp(),
          });
          chatRef = { id: existingChat.id };
        } else {
          // Create a new chat for the match
          const newChatRef = await firestore().collection('chats').add({
            type: 'dating',
            participants: [userId, match.id],
            relatedMatchId: matchRef.id,
            isMutual: true,
            lastMessage: null,
            relatedEventId: null,
            deletionPolicy: {
              type: 'on_unmatch',
              days: null,
            },
            allowDeleteForEveryone: false,
            deleteForEveryoneWindowDays: null,
            createdAt: firestore.FieldValue.serverTimestamp(),
            lastMessageAt: firestore.FieldValue.serverTimestamp(),
          });
          chatRef = newChatRef;
        }

        // Mark their original like as acted on (so it disappears from "Who Liked You")
        await existingLikeDoc.ref.update({ actedOnByTarget: true });

        // Store match data and show animation
        setMatchAnimationData({
          matchId: matchRef.id,
          chatId: chatRef.id,
          matchedUser: match,
        });
        setShowMatchAnimation(true);
      } else {
        console.log(`✅ Liked: ${match.name}`);
      }
      
      // Update state immediately (CardSwiper's useEffect will handle the animation reset)
      console.log(`🔄 Filtering out card ${cardIndex}, current count: ${matches.length}, will be: ${matches.length - 1}`);
      setMatches(prev => {
        const newMatches = prev.filter((_, idx) => idx !== cardIndex);
        console.log(`📊 New matches count: ${newMatches.length}`);
        return newMatches;
      });
      setCurrentPhotoIndex(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } catch (error) {
      console.error('Error saving like:', error);
    }
  };

  /**
   * Handle swipe left (pass)
   */
  const handleSwipeLeft = async (cardIndex: number) => {
    const match = matches[cardIndex];
    if (!match || !userId) return;

    try {
      // Save swipe to Firestore
      await firestore().collection('swipes').add({
        fromUserId: userId,
        toUserId: match.id,
        action: 'pass',
        actedOnByTarget: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log(`❌ Passed: ${match.name}`);
      
      // Update state immediately (CardSwiper's useEffect will handle the animation reset)
      setMatches(prev => prev.filter((_, idx) => idx !== cardIndex));
      setCurrentPhotoIndex(0);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } catch (error) {
      console.error('Error saving pass:', error);
    }
  };

  /**
   * Handle "Send Message" from match animation
   */
  const handleSendMessage = useCallback(() => {
    if (!matchAnimationData) return;
    
    showMatchAnimationRef.current = false; // Reset ref
    setShowMatchAnimation(false);
    
    // Navigate to chat with the matched user
    navigation.navigate('Chat', {
      chatId: matchAnimationData.chatId || null,
      recipientId: matchAnimationData.matchedUser.id,
      recipientName: matchAnimationData.matchedUser.name,
      recipientPhoto: matchAnimationData.matchedUser.photos?.[0]?.url,
    });
    
    setMatchAnimationData(null);
  }, [matchAnimationData, navigation]);

  /**
   * Handle "Keep Swiping" from match animation
   */
  const handleKeepSwiping = useCallback(() => {
    showMatchAnimationRef.current = false; // Reset ref
    setShowMatchAnimation(false);
    setMatchAnimationData(null);
  }, []);

  /**
   * Navigate photos in current card (optimized with useCallback)
   */
  const handleCardTap = useCallback((side: 'left' | 'right') => {
    const currentMatch = matches[0]; // Always first card since we filter out swiped
    if (!currentMatch || !currentMatch.photos.length) return;

    if (side === 'right') {
      setCurrentPhotoIndex((prev) =>
        prev < currentMatch.photos.length - 1 ? prev + 1 : 0
      );
    } else {
      setCurrentPhotoIndex((prev) =>
        prev > 0 ? prev - 1 : currentMatch.photos.length - 1
      );
    }
  }, [matches]);

  /**
   * Render individual card (memoized for performance)
   */
  const renderCard = useCallback((match: Match, index: number) => {
    const currentPhoto = match.photos[currentPhotoIndex]?.url || 'https://via.placeholder.com/400';
    const matchPercentage = Math.round(match.matchScore);
    
    // Show "unknown" if no location data
    const distanceText = match.location ? `${match.distance} km away` : 'Location unknown';

    return (
      <View style={styles.card}>
        {/* Photo with cache control for faster loading */}
        <Image 
          source={{ uri: currentPhoto, cache: 'force-cache' }} 
          style={styles.cardImage}
          resizeMode="cover"
          // Prefetch next photos in background
          onLoad={() => {
            // Preload next 2 photos for smoother transitions
            if (match.photos.length > 1) {
              const nextIndex = (currentPhotoIndex + 1) % match.photos.length;
              const nextNextIndex = (currentPhotoIndex + 2) % match.photos.length;
              if (match.photos[nextIndex]) {
                Image.prefetch(match.photos[nextIndex].url);
              }
              if (match.photos[nextNextIndex]) {
                Image.prefetch(match.photos[nextNextIndex].url);
              }
            }
          }}
        />

        {/* Photo navigation areas */}
        <TouchableOpacity
          style={styles.leftTapArea}
          onPress={() => handleCardTap('left')}
          activeOpacity={1}
        />
        <TouchableOpacity
          style={styles.rightTapArea}
          onPress={() => handleCardTap('right')}
          activeOpacity={1}
        />

        {/* Photo indicators */}
        {match.photos.length > 1 && (
          <View style={styles.photoIndicators}>
            {match.photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.indicator,
                  i === currentPhotoIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Match percentage badge */}
        <View style={styles.matchBadge}>
          <Text style={styles.matchPercentage}>{matchPercentage}%</Text>
          <Text style={styles.matchLabel}>Match</Text>
        </View>

        {/* Trust badge (profile completeness) */}
        <View style={styles.trustBadge}>
          <Text style={styles.trustPercentage}>{calculateProfileCompleteness(match)}%</Text>
          <Text style={styles.trustLabel}>Trusted</Text>
        </View>

        {/* Card info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardName}>
                {match.name}, {match.age}
              </Text>
              <View style={styles.cardMeta}>
                <Ionicons name="location-outline" size={14} color="#999999" />
                <Text style={styles.cardDistance}>{distanceText}</Text>
              </View>
            </View>
          </View>

          {/* Bio preview */}
          {match.bio && (
            <Text style={styles.cardBio} numberOfLines={2}>
              {match.bio}
            </Text>
          )}

          {/* Interests preview */}
          {match.interests.length > 0 && (
            <View style={styles.interestsTags}>
              {match.interests.slice(0, 3).map((interest, i) => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
              {match.interests.length > 3 && (
                <View style={styles.interestTag}>
                  <Text style={styles.interestText}>+{match.interests.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }, [currentPhotoIndex, handleCardTap]); // Include handleCardTap dependency

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#FF4458" />
        <Text style={styles.loadingText}>Finding matches...</Text>
      </View>
    );
  }

  // DEBUG: Log render conditions
  console.log(`🎨 RENDER CHECK: matches.length=${matches.length}, showMatchAnimation=${showMatchAnimation}`);

  // Show empty state when no matches (unless showing match animation)
  if (matches.length === 0 && !showMatchAnimation) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="heart" size={32} color="#FF4458" />
          <Text style={styles.title}>Swipe Hub</Text>
        </View>

        {/* Location Banner */}
        {showLocationBanner && (
          <View style={styles.locationBanner}>
            <View style={styles.locationBannerContent}>
              <Ionicons name="location" size={20} color="#856404" />
              <Text style={styles.locationBannerText}>
                Enable location for better matches nearby
              </Text>
            </View>
            <View style={styles.locationBannerActions}>
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleEnableLocation}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBannerButton}
                onPress={() => setShowLocationBanner(false)}
              >
                <Ionicons name="close" size={20} color="#856404" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* No matches content with pull-to-refresh */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF4458']}
              tintColor="#FF4458"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Ionicons name="people-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptyText}>
            Check back later for new profiles!{'\n'}Try adjusting your preferences or radius.
          </Text>
          <Text style={styles.pullToRefreshHint}>Pull down to refresh</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="heart" size={32} color="#FF4458" />
        <Text style={styles.title}>Swipe Hub</Text>
      </View>

      {/* Location Banner */}
      {showLocationBanner && (
        <View style={styles.locationBanner}>
          <View style={styles.locationBannerContent}>
            <Ionicons name="location" size={20} color="#856404" />
            <Text style={styles.locationBannerText}>
              Enable location for better matches nearby
            </Text>
          </View>
          <View style={styles.locationBannerActions}>
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleEnableLocation}
            >
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeBannerButton}
              onPress={() => setShowLocationBanner(false)}
            >
              <Ionicons name="close" size={20} color="#856404" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Scrollable Content - Bumble Style */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF4458']}
            tintColor="#FF4458"
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
        removeClippedSubviews={true} // Optimize memory by removing off-screen views
        scrollEventThrottle={16} // Smooth scroll performance
      >
        {/* Card Swiper Section */}
        <View style={styles.swiperContainer}>
          <CardSwiper
            data={matches}
            renderCard={renderCard}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            stackSize={3}
          />
        </View>

        {/* Scroll indicator */}
        {currentMatch && (
          <View style={styles.scrollIndicator}>
            <Ionicons name="chevron-down" size={24} color="#999999" />
            <Text style={styles.scrollHintText}>Scroll for more details</Text>
          </View>
        )}

        {/* Profile Details Section */}
        {currentMatch && (
          <View style={styles.profileDetailsContainer}>
            {/* Basic Info Header */}
            <View style={styles.detailHeader}>
              <Text style={styles.detailName}>{currentMatch.name}, {currentMatch.age}</Text>
              <View style={styles.detailLocation}>
                <Ionicons name="location-outline" size={16} color="#666666" />
                <Text style={styles.detailLocationText}>
                  {currentMatch.location ? `${currentMatch.distance} km away` : 'Location unknown'}
                </Text>
              </View>
            </View>

            {/* Bio Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Bio</Text>
              <Text style={styles.detailSectionContent}>
                {currentMatch.bio || 'No bio added yet'}
              </Text>
            </View>

            {/* Interests Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Interests</Text>
              {currentMatch.interests && currentMatch.interests.length > 0 ? (
                <View style={styles.interestsContainer}>
                  {currentMatch.interests.map((interest, index) => (
                    <View key={index} style={styles.interestChip}>
                      <Text style={styles.interestChipText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.detailEmptyText}>No interests added yet</Text>
              )}
            </View>

            {/* Looking For Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Looking For</Text>
              <Text style={styles.detailSectionContent}>
                {currentMatch.relationshipIntent || 'Not specified'}
              </Text>
            </View>

            {/* Interested In Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Interested In</Text>
              {currentMatch.interestedIn && currentMatch.interestedIn.length > 0 ? (
                <View style={styles.interestsContainer}>
                  {currentMatch.interestedIn.map((gender, index) => (
                    <View key={index} style={styles.preferenceChip}>
                      <Text style={styles.preferenceChipText}>{gender}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.detailEmptyText}>Not specified</Text>
              )}
            </View>

            {/* Gender Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Gender</Text>
              <Text style={styles.detailSectionContent}>
                {currentMatch.gender || 'Not specified'}
              </Text>
            </View>

            {/* Height Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Height</Text>
              <Text style={styles.detailSectionContent}>
                {currentMatch.height ? `${currentMatch.height.value} cm` : 'Not specified'}
              </Text>
            </View>

            {/* Occupation Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Occupation</Text>
              <Text style={styles.detailSectionContent}>
                {currentMatch.occupation || 'Not specified'}
              </Text>
            </View>

            {/* Social Handles Section */}
            {currentMatch.socialHandles && (
              currentMatch.socialHandles.instagram || 
              currentMatch.socialHandles.linkedin || 
              currentMatch.socialHandles.facebook || 
              currentMatch.socialHandles.twitter
            ) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Socials</Text>
                <View style={styles.socialIconsContainer}>
                  {currentMatch.socialHandles.instagram && (
                    <View style={styles.socialIconWrapper}>
                      <TouchableOpacity
                        style={styles.socialIconButton}
                        onPress={() => setExpandedSocial(expandedSocial === 'instagram' ? null : 'instagram')}
                      >
                        <Ionicons name="logo-instagram" size={28} color="#E4405F" />
                      </TouchableOpacity>
                      {expandedSocial === 'instagram' && (
                        <View style={styles.socialHandlePopup}>
                          <Text style={styles.socialHandlePopupText}>
                            @{currentMatch.socialHandles.instagram.replace('@', '')}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {currentMatch.socialHandles.linkedin && (
                    <View style={styles.socialIconWrapper}>
                      <TouchableOpacity
                        style={styles.socialIconButton}
                        onPress={() => setExpandedSocial(expandedSocial === 'linkedin' ? null : 'linkedin')}
                      >
                        <Ionicons name="logo-linkedin" size={28} color="#0A66C2" />
                      </TouchableOpacity>
                      {expandedSocial === 'linkedin' && (
                        <View style={styles.socialHandlePopup}>
                          <Text style={styles.socialHandlePopupText}>
                            {currentMatch.socialHandles.linkedin}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {currentMatch.socialHandles.facebook && (
                    <View style={styles.socialIconWrapper}>
                      <TouchableOpacity
                        style={styles.socialIconButton}
                        onPress={() => setExpandedSocial(expandedSocial === 'facebook' ? null : 'facebook')}
                      >
                        <Ionicons name="logo-facebook" size={28} color="#1877F2" />
                      </TouchableOpacity>
                      {expandedSocial === 'facebook' && (
                        <View style={styles.socialHandlePopup}>
                          <Text style={styles.socialHandlePopupText}>
                            {currentMatch.socialHandles.facebook}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {currentMatch.socialHandles.twitter && (
                    <View style={styles.socialIconWrapper}>
                      <TouchableOpacity
                        style={styles.socialIconButton}
                        onPress={() => setExpandedSocial(expandedSocial === 'twitter' ? null : 'twitter')}
                      >
                        <Text style={styles.xLogoLarge}>𝕏</Text>
                      </TouchableOpacity>
                      {expandedSocial === 'twitter' && (
                        <View style={styles.socialHandlePopup}>
                          <Text style={styles.socialHandlePopupText}>
                            @{currentMatch.socialHandles.twitter.replace('@', '')}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Bottom padding for scroll */}
            <View style={styles.bottomPadding} />
          </View>
        )}
      </ScrollView>

      {/* Match Animation Overlay - shown when mutual match detected */}
      <MatchAnimation
        visible={showMatchAnimation}
        currentUserPhoto={currentUserPhoto}
        matchedUserPhoto={matchAnimationData?.matchedUser.photos.find(p => p.isPrimary)?.url || matchAnimationData?.matchedUser.photos[0]?.url}
        matchedUserName={matchAnimationData?.matchedUser.name}
        onSendMessage={handleSendMessage}
        onKeepSwiping={handleKeepSwiping}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEEBA',
  },
  locationBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  locationBannerText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
  locationBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enableButton: {
    backgroundColor: '#FF4458',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeBannerButton: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  swiperContainer: {
    height: CARD_HEIGHT + 40,
    paddingTop: 10,
  },
  pullToRefreshHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '70%',
    resizeMode: 'cover',
  },
  leftTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '40%',
    height: '70%',
  },
  rightTapArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '40%',
    height: '70%',
  },
  photoIndicators: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  indicator: {
    width: 30,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  matchBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF4458',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  matchPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  matchLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: -2,
  },
  trustBadge: {
    position: 'absolute',
    top: 75, // Below match badge
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  trustPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  trustLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: -2,
  },
  cardInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDistance: {
    fontSize: 14,
    color: '#999999',
  },
  cardBio: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginTop: 8,
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  interestTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interestText: {
    fontSize: 12,
    color: '#666666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 60,
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  likeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  pullToRefreshHint: {
    marginTop: 20,
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  // Location Request Styles
  locationRequestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  locationIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF0F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  locationRequestTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  locationRequestDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  enableLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 8,
    minWidth: 200,
  },
  enableLocationButtonDisabled: {
    backgroundColor: '#FFB0B8',
  },
  enableLocationButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  locationPrivacyText: {
    marginTop: 20,
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  // Profile Details Styles (Bumble-style scroll)
  scrollIndicator: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scrollHintText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },
  profileDetailsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    marginTop: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  detailHeader: {
    marginBottom: 24,
  },
  detailName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  detailLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLocationText: {
    fontSize: 15,
    color: '#666666',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  detailSectionContent: {
    fontSize: 16,
    color: '#444444',
    lineHeight: 24,
  },
  detailEmptyText: {
    fontSize: 15,
    color: '#999999',
    fontStyle: 'italic',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: '#FFF0F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD6DA',
  },
  interestChipText: {
    fontSize: 14,
    color: '#FF4458',
    fontWeight: '500',
  },
  preferenceChip: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B3D9F2',
  },
  preferenceChipText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verificationText: {
    fontSize: 15,
    fontWeight: '500',
  },
  matchScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchScoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  matchScoreFill: {
    height: '100%',
    backgroundColor: '#FF4458',
    borderRadius: 4,
  },
  matchScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4458',
    width: 45,
    textAlign: 'right',
  },
  socialIconsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  socialIconWrapper: {
    alignItems: 'center',
  },
  socialIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  socialHandlePopup: {
    marginTop: 8,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: 150,
  },
  socialHandlePopupText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  xLogoLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  bottomPadding: {
    height: 40,
  },
});

export default SwipeHubScreen;

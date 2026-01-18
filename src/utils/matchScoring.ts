/**
 * MATCH SCORING UTILITY
 * 
 * Calculates match compatibility score based on:
 * - Distance (0-30 points)
 * - Relationship intent (0-30 points)
 * - Shared interests (0-30 points)
 * - Activity recency (0-10 points)
 * 
 * Total: 0-100 points
 */

interface UserProfile {
  location?: {
    latitude: number;
    longitude: number;
  };
  matchRadiusKm: number;
  relationshipIntent: string | null;
  interests: string[];
  lastActiveAt?: any;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate distance score (0-30 points)
 * Closer = higher score
 */
const calculateDistanceScore = (
  distance: number,
  maxRadius: number
): number => {
  if (distance > maxRadius) return 0;
  return Math.round(30 * (1 - distance / maxRadius));
};

/**
 * Calculate relationship intent compatibility (0-30 points)
 */
const calculateIntentScore = (
  userIntent: string | null,
  matchIntent: string | null
): number => {
  if (!userIntent || !matchIntent) return 10; // Neutral score if unknown
  
  // Exact match
  if (userIntent === matchIntent) return 30;
  
  // Compatible overlaps
  const compatiblePairs = [
    ['casual', 'unsure'],
    ['long_term', 'unsure'],
    ['friendship', 'unsure'],
  ];
  
  const isCompatible = compatiblePairs.some(
    ([a, b]) =>
      (userIntent === a && matchIntent === b) ||
      (userIntent === b && matchIntent === a)
  );
  
  if (isCompatible) return 20;
  
  // Weak overlap
  return 10;
};

/**
 * Calculate shared interests score (0-30 points)
 */
const calculateInterestsScore = (
  userInterests: string[],
  matchInterests: string[]
): number => {
  if (!userInterests.length || !matchInterests.length) return 0;
  
  const common = userInterests.filter((interest) =>
    matchInterests.includes(interest)
  );
  
  const maxInterests = Math.max(userInterests.length, matchInterests.length);
  return Math.round((common.length / maxInterests) * 30);
};

/**
 * Calculate activity recency score (0-10 points)
 */
const calculateActivityScore = (lastActiveAt: any): number => {
  if (!lastActiveAt) return 0;
  
  const now = Date.now();
  const lastActive = lastActiveAt.toDate ? lastActiveAt.toDate().getTime() : lastActiveAt;
  const hoursSinceActive = (now - lastActive) / (1000 * 60 * 60);
  
  if (hoursSinceActive < 1) return 10;
  if (hoursSinceActive < 24) return 6;
  if (hoursSinceActive < 72) return 3;
  return 0;
};

/**
 * Calculate total match score (0-100)
 */
export const calculateMatchScore = (
  currentUser: UserProfile,
  potentialMatch: UserProfile,
  distance: number
): number => {
  const distanceScore = calculateDistanceScore(distance, currentUser.matchRadiusKm);
  const intentScore = calculateIntentScore(
    currentUser.relationshipIntent,
    potentialMatch.relationshipIntent
  );
  const interestsScore = calculateInterestsScore(
    currentUser.interests,
    potentialMatch.interests
  );
  const activityScore = calculateActivityScore(potentialMatch.lastActiveAt);
  
  return distanceScore + intentScore + interestsScore + activityScore;
};

/**
 * Check if two users pass hard filters
 */
export const passesFilters = (
  currentUser: {
    interestedIn: string[];
    matchRadiusKm: number;
    relationshipIntent: string | null;
  },
  potentialMatch: {
    gender: string;
    relationshipIntent: string | null;
  },
  distance: number
): boolean => {
  // Distance filter
  if (distance > currentUser.matchRadiusKm) return false;
  
  // Gender preference filter
  if (!currentUser.interestedIn.includes(potentialMatch.gender)) return false;
  
  // Relationship intent basic compatibility
  if (currentUser.relationshipIntent && potentialMatch.relationshipIntent) {
    const incompatiblePairs = [
      ['hookups', 'long_term'],
      ['hookups', 'friendship'],
    ];
    
    const isIncompatible = incompatiblePairs.some(
      ([a, b]) =>
        (currentUser.relationshipIntent === a && potentialMatch.relationshipIntent === b) ||
        (currentUser.relationshipIntent === b && potentialMatch.relationshipIntent === a)
    );
    
    if (isIncompatible) return false;
  }
  
  return true;
};

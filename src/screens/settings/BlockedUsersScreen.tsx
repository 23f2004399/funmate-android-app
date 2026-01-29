/**
 * BLOCKED USERS SCREEN
 * 
 * Settings screen showing all blocked users with unblock option
 * Primary method for unblocking users
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { BlockedUser, User } from '../../types/database';
import { getBlockedUsers, unblockUser } from '../../services/blockService';

interface BlockedUserWithDetails extends BlockedUser {
  userDetails?: User;
}

export const BlockedUsersScreen: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserId = auth().currentUser?.uid;

  const loadBlockedUsers = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);
      const blocked = await getBlockedUsers(currentUserId);

      // Fetch user details for each blocked user
      const blockedWithDetails = await Promise.all(
        blocked.map(async (block) => {
          try {
            const userDoc = await firestore()
              .collection('users')
              .doc(block.blockedUserId)
              .get();

            return {
              ...block,
              userDetails: userDoc.exists()
                ? ({ id: userDoc.id, ...userDoc.data() } as User)
                : undefined,
            };
          } catch (error) {
            console.error(`Error fetching user ${block.blockedUserId}:`, error);
            return block;
          }
        })
      );

      setBlockedUsers(blockedWithDetails);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBlockedUsers();
    setRefreshing(false);
  };

  const handleUnblock = (blockedUserId: string, userName: string) => {
    if (!currentUserId) return;

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${userName}? You'll be able to see each other's profiles again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await unblockUser(currentUserId, blockedUserId);
              
              // Remove from local state
              setBlockedUsers(prev =>
                prev.filter(user => user.blockedUserId !== blockedUserId)
              );
              
              Alert.alert('Unblocked', `${userName} has been unblocked.`);
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderBlockedUser = ({ item }: { item: BlockedUserWithDetails }) => {
    const user = item.userDetails;
    const displayName = user?.name || 'Unknown User';
    const displayAge = user?.age ? `, ${user.age}` : '';
    const primaryPhoto = user?.photos?.find(p => p.isPrimary)?.url;

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          {primaryPhoto ? (
            <Image source={{ uri: primaryPhoto }} style={styles.userPhoto} />
          ) : (
            <View style={[styles.userPhoto, styles.userPhotoPlaceholder]}>
              <Text style={styles.userPhotoPlaceholderText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.userTextInfo}>
            <Text style={styles.userName}>
              {displayName}
              {displayAge}
            </Text>
            {item.reason && (
              <Text style={styles.blockReason} numberOfLines={1}>
                Reason: {item.reason}
              </Text>
            )}
            <Text style={styles.blockedDate}>
              Blocked {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() => handleUnblock(item.blockedUserId, displayName)}
        >
          <Text style={styles.unblockButtonText}>Unblock</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🚫</Text>
      <Text style={styles.emptyTitle}>No Blocked Users</Text>
      <Text style={styles.emptySubtitle}>
        Users you block will appear here
      </Text>
    </View>
  );

  if (isLoading && blockedUsers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E94057" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={blockedUsers}
        renderItem={renderBlockedUser}
        keyExtractor={(item) => item.id || item.blockedUserId}
        contentContainerStyle={
          blockedUsers.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
        ListEmptyComponent={renderEmpty}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    </View>
  );
};

const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'recently';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  userPhotoPlaceholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPhotoPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  blockReason: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  blockedDate: {
    fontSize: 12,
    color: '#999',
  },
  unblockButton: {
    backgroundColor: '#E94057',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unblockButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

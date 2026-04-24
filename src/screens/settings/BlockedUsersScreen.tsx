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
  ActivityIndicator,
  Image,
  Modal,
  StatusBar,
  ImageBackground,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { BlockedUser, User } from '../../types/database';
import { getBlockedUsers, unblockUser } from '../../services/blockService';
import { useAlert } from '../../contexts/AlertContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BlockedUserWithDetails extends BlockedUser {
  userDetails?: User;
}

export const BlockedUsersScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showError } = useAlert();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockModal, setUnblockModal] = useState<{ visible: boolean; userId: string; userName: string }>({
    visible: false,
    userId: '',
    userName: '',
  });
  const [isUnblocking, setIsUnblocking] = useState(false);

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
      showError('Error', 'Failed to load blocked users');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, showError]);

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
    setUnblockModal({ visible: true, userId: blockedUserId, userName });
  };

  const confirmUnblock = async () => {
    if (!currentUserId || !unblockModal.userId) return;

    setIsUnblocking(true);
    try {
      await unblockUser(currentUserId, unblockModal.userId);
      
      // Remove from local state
      setBlockedUsers(prev =>
        prev.filter(user => user.blockedUserId !== unblockModal.userId)
      );
      
      setUnblockModal({ visible: false, userId: '', userName: '' });
    } catch (error) {
      console.error('Error unblocking user:', error);
      showError('Error', 'Failed to unblock user. Please try again.');
    } finally {
      setIsUnblocking(false);
    }
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
      <View style={styles.emptyIconContainer}>
        <Ionicons name="ban" size={64} color="#06B6D4" />
      </View>
      <Text style={styles.emptyTitle}>No Blocked Users</Text>
      <Text style={styles.emptySubtitle}>
        Users you block will appear here
      </Text>
    </View>
  );

  if (isLoading && blockedUsers.length === 0) {
    return (
      <ImageBackground
        source={require('../../assets/images/bg_splash.webp')}
        style={styles.container}
        resizeMode="cover"
        blurRadius={10}
      >
        <View style={styles.overlay}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/bg_splash.webp')}
      style={styles.container}
      resizeMode="cover"
      blurRadius={10}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={blockedUsers}
        renderItem={renderBlockedUser}
        keyExtractor={(item) => item.id || item.blockedUserId}
        contentContainerStyle={[
          blockedUsers.length === 0 ? styles.emptyListContainer : styles.listContainer,
          { paddingBottom: Math.max(24, insets.bottom + 16) },
        ]}
        ListEmptyComponent={renderEmpty}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Custom Unblock Confirmation Modal */}
      <Modal
        transparent
        visible={unblockModal.visible}
        animationType="fade"
        onRequestClose={() => setUnblockModal({ visible: false, userId: '', userName: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="person-remove" size={32} color="#FF4D6D" />
            </View>
            <Text style={styles.modalTitle}>Unblock User</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to unblock {unblockModal.userName}? You'll be able to see each other's profiles again.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setUnblockModal({ visible: false, userId: '', userName: '' })}
                disabled={isUnblocking}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalUnblockButton}
                onPress={confirmUnblock}
                disabled={isUnblocking}
              >
                {isUnblocking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalUnblockButtonText}>Unblock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </ImageBackground>
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
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.60)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  headerRight: {
    width: 40,
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
    backgroundColor: 'rgba(26, 21, 48, 0.78)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.30)',
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
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPhotoPlaceholderText: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  blockReason: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 2,
  },
  blockedDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  unblockButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF4D6D',
  },
  unblockButtonText: {
    color: '#FF4D6D',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(26, 21, 48, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  emptyTitle: {
      fontSize: 22,
      fontFamily: 'Inter-Bold',
      color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#1A1530',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 77, 109, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.60)',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  modalUnblockButton: {
    flex: 1,
    backgroundColor: '#FF4D6D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalUnblockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});

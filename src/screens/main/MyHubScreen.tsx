/**
 * MY HUB SCREEN
 * 
 * Central hub for all communication:
 * - Individual chats
 * - Group chats
 * - Event group chats
 * - Like notifications (who liked you)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const MyHubScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chatbubbles" size={32} color="#FF4458" />
        <Text style={styles.title}>My Hub</Text>
      </View>

      {/* Placeholder Content */}
      <View style={styles.content}>
        <Ionicons name="chatbubbles-outline" size={80} color="#E0E0E0" />
        <Text style={styles.placeholderTitle}>My Hub Coming Soon</Text>
        <Text style={styles.placeholderText}>
          Your central communication hub
        </Text>
        <Text style={styles.placeholderSubtext}>
          • View all chats{'\n'}
          • See who liked you{'\n'}
          • Group conversations{'\n'}
          • Event group chats
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default MyHubScreen;

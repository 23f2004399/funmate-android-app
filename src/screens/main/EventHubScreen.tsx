/**
 * EVENT HUB SCREEN
 * 
 * Discover and join events hosted by individuals and merchants
 * - Browse upcoming events
 * - Filter by interests, location, date
 * - Join events
 * - View event details
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const EventHubScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="calendar" size={32} color="#FF4458" />
        <Text style={styles.title}>Event Hub</Text>
      </View>

      {/* Coming Soon Content */}
      <View style={styles.content}>
        <Ionicons name="calendar-outline" size={80} color="#E0E0E0" />
        <Text style={styles.placeholderTitle}>Event Hub Coming Soon</Text>
        <Text style={styles.placeholderText}>
          Discover and join amazing events
        </Text>
        <Text style={styles.placeholderSubtext}>
          • Browse local events{'\n'}
          • Filter by interests{'\n'}
          • Join event groups{'\n'}
          • Host your own events
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

export default EventHubScreen;

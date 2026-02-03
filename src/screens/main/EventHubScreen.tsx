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
      <StatusBar barStyle="light-content" backgroundColor="#0E1621" />
      
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="calendar" size={32} color="#378BBB" />
        <Text style={styles.title}>Event Hub</Text>
      </View>

      {/* Coming Soon Content */}
      <View style={styles.content}>
        <Ionicons name="calendar-outline" size={80} color="#7F93AA" />
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
    backgroundColor: '#0E1621',
  },
  header: {
    flexDirection: 'row',
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
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#7F93AA',
    textAlign: 'center',
    marginBottom: 24,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#7F93AA',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default EventHubScreen;

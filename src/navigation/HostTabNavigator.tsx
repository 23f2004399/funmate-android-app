/**
 * HOST TAB NAVIGATOR
 * 
 * Bottom navigation for hosts (both Individual and Merchant)
 * 4 main sections: Dashboard, Events, Payouts, Profile
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HostDashboardScreen from '../screens/host/HostDashboardScreen';
import HostEventsScreen from '../screens/host/HostEventsScreen';
import HostPayoutsScreen from '../screens/host/HostPayoutsScreen';
import HostProfileScreen from '../screens/host/HostProfileScreen';

export type HostTabParamList = {
  Dashboard: undefined;
  Events: undefined;
  Payouts: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<HostTabParamList>();

const HostTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Payouts':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#FF4D6D',
        tabBarInactiveTintColor: '#378BBB',
        tabBarStyle: {
          backgroundColor: '#16283D',
          borderTopWidth: 2,
          borderTopColor: '#378BBB',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 8,
          shadowColor: '#378BBB',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 15,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          color: '#FFFFFF',
        },
      })}
      initialRouteName="Dashboard"
    >
      <Tab.Screen 
        name="Dashboard" 
        component={HostDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen 
        name="Events" 
        component={HostEventsScreen}
        options={{
          tabBarLabel: 'Events',
        }}
      />
      <Tab.Screen 
        name="Payouts" 
        component={HostPayoutsScreen}
        options={{
          tabBarLabel: 'Payouts',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={HostProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  activeIconContainer: {
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default HostTabNavigator;

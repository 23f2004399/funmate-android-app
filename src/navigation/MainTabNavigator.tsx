/**
 * MAIN TAB NAVIGATOR
 * 
 * Bottom navigation bar shown after user completes signup
 * 4 main sections: My Hub, Swipe Hub, Event Hub, Profile
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SwipeHubScreen from '../screens/main/SwipeHubScreen';
import MyHubScreen from '../screens/main/MyHubScreen';
import EventHubScreen from '../screens/main/EventHubScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

export type MainTabParamList = {
  MyHub: undefined;
  SwipeHub: undefined;
  EventHub: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'MyHub':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'SwipeHub':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'EventHub':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF4458',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 60,
          paddingBottom: 10,
          paddingTop: 8,
          marginBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
      initialRouteName="SwipeHub"
    >
      <Tab.Screen 
        name="MyHub" 
        component={MyHubScreen}
        options={{
          tabBarLabel: 'My Hub',
        }}
      />
      <Tab.Screen 
        name="SwipeHub" 
        component={SwipeHubScreen}
        options={{
          tabBarLabel: 'Swipe Hub',
        }}
      />
      <Tab.Screen 
        name="EventHub" 
        component={EventHubScreen}
        options={{
          tabBarLabel: 'Event Hub',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

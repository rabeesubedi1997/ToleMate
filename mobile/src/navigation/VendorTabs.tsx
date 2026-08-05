import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import VendorDashboardScreen from '../screens/Vendor/VendorDashboardScreen';
import VendorServicesScreen from '../screens/Vendor/VendorServicesScreen';
import VendorBookingsScreen from '../screens/Vendor/VendorBookingsScreen';
import ChatsScreen from '../screens/Customer/ChatsScreen';
import VendorProfileScreen from '../screens/Vendor/VendorProfileScreen';
import { COLORS } from '../theme';
import { VendorTabParamList } from './types';

const Tab = createBottomTabNavigator<VendorTabParamList>();

const TAB_ICONS: Record<keyof VendorTabParamList, string> = {
  Dashboard: 'dashboard',
  Services: 'handyman',
  Bookings: 'event-note',
  Messages: 'chat-bubble',
  Profile: 'person',
};

const renderTabIcon =
  (name: string) =>
  ({ color, size }: { color: string; size: number }) => (
    <MaterialIcons name={name} size={size} color={color} />
  );

const VendorTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.slate500,
      tabBarIcon: renderTabIcon(TAB_ICONS[route.name]),
    })}
  >
    <Tab.Screen name="Dashboard" component={VendorDashboardScreen} />
    <Tab.Screen name="Services" component={VendorServicesScreen} />
    <Tab.Screen name="Bookings" component={VendorBookingsScreen} />
    <Tab.Screen name="Messages" component={ChatsScreen} />
    <Tab.Screen name="Profile" component={VendorProfileScreen} />
  </Tab.Navigator>
);

export default VendorTabs;
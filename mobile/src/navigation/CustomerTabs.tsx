import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import HomeScreen from '../screens/Customer/HomeScreen';
import MarketplaceScreen from '../screens/Customer/MarketplaceScreen';
import ChatsScreen from '../screens/Customer/ChatsScreen';
import NotificationsScreen from '../screens/Customer/NotificationsScreen';
import ProfileScreen from '../screens/Customer/ProfileScreen';
import { COLORS } from '../theme';
import { CustomerTabParamList } from './types';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

const TAB_ICONS: Record<keyof CustomerTabParamList, string> = {
  Home: 'home',
  Marketplace: 'storefront',
  Messages: 'chat-bubble',
  Notifications: 'notifications',
  Profile: 'person',
};

const renderTabIcon =
  (name: string) =>
  ({ color, size }: { color: string; size: number }) => (
    <MaterialIcons name={name} size={size} color={color} />
  );

const CustomerTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.slate500,
      tabBarIcon: renderTabIcon(TAB_ICONS[route.name]),
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
    <Tab.Screen name="Messages" component={ChatsScreen} />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default CustomerTabs;

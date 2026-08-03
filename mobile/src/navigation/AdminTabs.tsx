import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AdminOverviewScreen from '../screens/Admin/AdminOverviewScreen';
import AdminUsersScreen from '../screens/Admin/AdminUsersScreen';
import AdminVendorsScreen from '../screens/Admin/AdminVendorsScreen';
import AdminMenuScreen from '../screens/Admin/AdminMenuScreen';
import { COLORS } from '../theme';
import { AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TAB_ICONS: Record<keyof AdminTabParamList, string> = {
  Overview: 'dashboard',
  Users: 'people',
  Vendors: 'storefront',
  Menu: 'menu',
};

const renderTabIcon =
  (name: string) =>
  ({ color, size }: { color: string; size: number }) => (
    <MaterialIcons name={name} size={size} color={color} />
  );

const AdminTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray400,
      tabBarIcon: renderTabIcon(TAB_ICONS[route.name]),
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    })}
  >
    <Tab.Screen name="Overview" component={AdminOverviewScreen} />
    <Tab.Screen name="Users" component={AdminUsersScreen} />
    <Tab.Screen name="Vendors" component={AdminVendorsScreen} />
    <Tab.Screen name="Menu" component={AdminMenuScreen} />
  </Tab.Navigator>
);

export default AdminTabs;

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomerTabs from './CustomerTabs';
import VendorTabs from './VendorTabs';
import AdminTabs from './AdminTabs';
import ServiceDetailScreen from '../screens/Customer/ServiceDetailScreen';
import VendorPublicProfileScreen from '../screens/Customer/VendorPublicProfileScreen';
import FavoritesScreen from '../screens/Customer/FavoritesScreen';
import BookingFormScreen from '../screens/Customer/BookingFormScreen';
import MyBookingsScreen from '../screens/Customer/MyBookingsScreen';
import PostRequestScreen from '../screens/Customer/PostRequestScreen';
import VendorRequestsScreen from '../screens/Vendor/VendorRequestsScreen';
import VendorBookingsScreen from '../screens/Vendor/VendorBookingsScreen';
import AdminChatScreen from '../screens/Admin/AdminChatScreen';
import AdminBookingsScreen from '../screens/Admin/AdminBookingsScreen';
import AdminServicesScreen from '../screens/Admin/AdminServicesScreen';
import AdminCategoriesScreen from '../screens/Admin/AdminCategoriesScreen';
import AdminReviewsScreen from '../screens/Admin/AdminReviewsScreen';
import AdminMessagesScreen from '../screens/Admin/AdminMessagesScreen';
import AdminMenusScreen from '../screens/Admin/AdminMenusScreen';
import AdminMediaScreen from '../screens/Admin/AdminMediaScreen';
import AdminSliderScreen from '../screens/Admin/AdminSliderScreen';
import AdminCouponsScreen from '../screens/Admin/AdminCouponsScreen';
import AdminModerationScreen from '../screens/Admin/AdminModerationScreen';
import AdminCommissionsScreen from '../screens/Admin/AdminCommissionsScreen';
import AdminKycScreen from '../screens/Admin/AdminKycScreen';
import AdminActivityScreen from '../screens/Admin/AdminActivityScreen';
import AdminSettingsScreen from '../screens/Admin/AdminSettingsScreen';
import AdminSeoScreen from '../screens/Admin/AdminSeoScreen';
import AdminPageSeoScreen from '../screens/Admin/AdminPageSeoScreen';
import { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainStack: React.FC<{ role: string }> = ({ role }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen
      name="Tabs"
      component={
        role === 'vendor'
          ? VendorTabs
          : role === 'admin' || role === 'super_admin'
            ? AdminTabs
            : CustomerTabs
      }
    />
    <Stack.Screen
      name="PublicTabs"
      component={CustomerTabs}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="ServiceDetail"
      component={ServiceDetailScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="VendorPublic"
      component={VendorPublicProfileScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="BookingForm"
      component={BookingFormScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="MyBookings"
      component={MyBookingsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="PostRequest"
      component={PostRequestScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="VendorRequests"
      component={VendorRequestsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="VendorBookings"
      component={VendorBookingsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminChat"
      component={AdminChatScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="Chat"
      component={AdminChatScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminBookings"
      component={AdminBookingsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminServices"
      component={AdminServicesScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminCategories"
      component={AdminCategoriesScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminReviews"
      component={AdminReviewsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminMessages"
      component={AdminMessagesScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminMenus"
      component={AdminMenusScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminMedia"
      component={AdminMediaScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminSlider"
      component={AdminSliderScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminCoupons"
      component={AdminCouponsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminModeration"
      component={AdminModerationScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminCommissions"
      component={AdminCommissionsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminKyc"
      component={AdminKycScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminActivity"
      component={AdminActivityScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminSettings"
      component={AdminSettingsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminSeo"
      component={AdminSeoScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <Stack.Screen
      name="AdminPageSeo"
      component={AdminPageSeoScreen}
      options={{ animation: 'slide_from_right' }}
    />
  </Stack.Navigator>
);

export default MainStack;

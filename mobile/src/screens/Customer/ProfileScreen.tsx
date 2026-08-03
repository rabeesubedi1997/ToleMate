import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../theme';
import { CustomerTabParamList, MainStackParamList } from '../../navigation/types';

type Props = BottomTabScreenProps<CustomerTabParamList, 'Profile'>;

type Nav = CompositeNavigationProp<
  Props['navigation'],
  NativeStackNavigationProp<MainStackParamList>
>;

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const initials = (user?.name ?? '?')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Favorites')}
          >
            <MaterialIcons name="favorite" size={20} color={COLORS.rose} />
            <Text style={styles.menuLabel}>My Favorites</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.slate400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <MaterialIcons name="receipt-long" size={20} color={COLORS.primary} />
            <Text style={styles.menuLabel}>My Bookings</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.slate400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <MaterialIcons name="notifications-none" size={20} color={COLORS.accent} />
            <Text style={styles.menuLabel}>Notifications</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.slate400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <MaterialIcons name="help-outline" size={20} color={COLORS.slate500} />
            <Text style={styles.menuLabel}>Help & Support</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.slate400} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={COLORS.rose} />
            <Text style={[styles.menuLabel, { color: COLORS.rose }]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  userCard: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: '700',
  },
  name: {
    marginTop: SPACING.sm,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  email: {
    marginTop: 2,
    fontSize: 14,
    color: COLORS.slate500,
  },
  menu: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
    gap: SPACING.sm,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
    fontWeight: '500',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
});

export default ProfileScreen;

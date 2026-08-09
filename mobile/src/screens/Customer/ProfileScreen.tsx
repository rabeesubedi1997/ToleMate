import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
import { CustomerTabParamList, MainStackParamList } from '../../navigation/types';
import CustomerEditModal from './CustomerEditModal';

type Props = BottomTabScreenProps<CustomerTabParamList, 'Profile'>;

type Nav = CompositeNavigationProp<
  Props['navigation'],
  NativeStackNavigationProp<MainStackParamList>
>;

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  bg: string;
  fg: string;
  onPress: () => void;
}

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const initials = (user?.name ?? '?')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const menuItems: MenuItem[] = [
    {
      key: 'favorites',
      icon: 'favorite',
      label: 'My Favorites',
      bg: COLORS.roseBg,
      fg: COLORS.rose,
      onPress: () => navigation.navigate('Favorites'),
    },
    {
      key: 'bookings',
      icon: 'receipt-long',
      label: 'My Bookings',
      bg: COLORS.primary100,
      fg: COLORS.primary700,
      onPress: () => navigation.navigate('MyBookings'),
    },
    {
      key: 'notifications',
      icon: 'notifications-none',
      label: 'Notifications',
      bg: COLORS.warningBg,
      fg: COLORS.warningText,
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      key: 'post',
      icon: 'campaign',
      label: 'Post a Request',
      bg: COLORS.infoBg,
      fg: COLORS.infoText,
      onPress: () => navigation.navigate('PostRequest'),
    },
    {
      key: 'help',
      icon: 'help-outline',
      label: 'Help & Support',
      bg: COLORS.neutralBg,
      fg: COLORS.gray600,
      onPress: () =>
        toast.info('Contact support at support@tolemate.com'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setShowEdit(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="edit" size={16} color={COLORS.white} />
            <Text style={styles.editBtnText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menu}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                <MaterialIcons name={item.icon as never} size={18} color={item.fg} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={() => setConfirmLogout(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: COLORS.roseBg }]}>
              <MaterialIcons name="logout" size={18} color={COLORS.rose} />
            </View>
            <Text style={[styles.menuLabel, styles.menuLabelRose, { color: COLORS.rose }]}>
              Log out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomerEditModal visible={showEdit} onClose={() => setShowEdit(false)} />

      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message="Are you sure you want to log out?"
        tone="danger"
        icon="logout"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
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
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  scroll: {
    paddingBottom: SPACING.xl,
  },
  userCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOW.card,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.primary200,
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
    color: COLORS.gray900,
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.gray500,
  },
  phone: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.gray500,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    height: 46,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  menu: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray100,
    gap: SPACING.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray700,
    fontWeight: '500',
  },
  menuLabelRose: {
    flex: 1,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
});

export default ProfileScreen;
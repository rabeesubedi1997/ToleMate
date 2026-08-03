import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/AdminHeader';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
import { MainStackParamList } from '../../navigation/types';

interface Section {
  label: string;
  icon: string;
  target: keyof MainStackParamList | 'Overview' | 'Users' | 'Vendors';
  superOnly?: boolean;
}

interface Group {
  label: string;
  items: Section[];
  superOnly?: boolean;
}

const GROUPS: Group[] = [
  {
    label: 'Management',
    items: [
      { label: 'Overview', icon: 'dashboard', target: 'Overview' },
      { label: 'Users', icon: 'people', target: 'Users' },
      { label: 'Vendors', icon: 'storefront', target: 'Vendors' },
      { label: 'Bookings', icon: 'event-note', target: 'AdminBookings' },
      { label: 'Services', icon: 'build', target: 'AdminServices' },
      { label: 'Categories', icon: 'category', target: 'AdminCategories' },
      { label: 'Reviews', icon: 'star', target: 'AdminReviews' },
      { label: 'Messages', icon: 'chat', target: 'AdminMessages' },
      { label: 'Menus', icon: 'list', target: 'AdminMenus' },
    ],
  },
  {
    label: 'Media',
    items: [
      { label: 'Media Library', icon: 'image', target: 'AdminMedia' },
      { label: 'Hero Slider', icon: 'layers', target: 'AdminSlider' },
    ],
  },
  {
    label: 'Commerce',
    items: [{ label: 'Coupons', icon: 'local-offer', target: 'AdminCoupons' }],
  },
  {
    label: 'Super Admin',
    superOnly: true,
    items: [
      { label: 'Moderation', icon: 'verified', target: 'AdminModeration' },
      { label: 'Commissions', icon: 'payments', target: 'AdminCommissions' },
      { label: 'KYC Review', icon: 'badge', target: 'AdminKyc' },
      { label: 'Activity Log', icon: 'history', target: 'AdminActivity' },
    ],
  },
  {
    label: 'Links',
    items: [
      {
        label: 'View Site',
        icon: 'public',
        target: 'PublicTabs',
      },
      {
        label: 'Marketplace',
        icon: 'storefront',
        target: 'PublicTabs',
      },
    ],
  },
  {
    label: 'System',
    superOnly: true,
    items: [
      { label: 'SEO', icon: 'language', target: 'AdminSeo' },
      { label: 'Page SEO', icon: 'description', target: 'AdminPageSeo' },
      { label: 'Settings', icon: 'settings', target: 'AdminSettings' },
    ],
  },
];

const AdminMenuScreen: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigation = useNavigation();

  const groups = GROUPS.filter(
    g => !g.superOnly || isSuperAdmin,
  );

  const go = (target: Section['target']) => {
    navigation.navigate(target as never);
  };

  return (
    <FlatList
      style={styles.container}
      data={groups}
      keyExtractor={g => g.label}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <AdminHeader
          title="Admin Menu"
          subtitle="Everything you can manage on the platform"
        />
      }
      renderItem={({ item: group }) => (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <View style={styles.grid}>
            {group.items.map(item => (
              <Pressable
                key={item.label}
                style={styles.card}
                onPress={() => go(item.target)}
              >
                <View style={styles.icon}>
                  <MaterialIcons
                    name={item.icon}
                    size={22}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.label} numberOfLines={2}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  group: {
    marginBottom: SPACING.lg,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  card: {
    width: '30.5%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOW.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray800,
    textAlign: 'center',
  },
});

export default AdminMenuScreen;

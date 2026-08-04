import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW, FONT_SIZE } from '../../theme';
import { VendorTabParamList, MainStackParamList } from '../../navigation/types';
import VendorEditModal from './VendorEditModal';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<VendorTabParamList, 'Profile'>,
  NativeStackNavigationProp<MainStackParamList>
>;

interface VendorProfile {
  business_name: string;
  description?: string | null;
  rating: string | number;
  service_area_radius: number;
  is_verified: boolean;
  is_featured: boolean;
  subscription_plan?: string | null;
  kyc_status?: string | null;
  whatsapp_enabled?: boolean;
  whatsapp_number?: string | null;
  website?: string | null;
  avatar?: string | null;
}

const VendorProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/vendor/profile');
      setProfile(res.data);
    } catch (e) {
      console.warn('vendor profile load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const kyc = profile?.kyc_status ?? 'not_submitted';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.business_name?.slice(0, 2).toUpperCase() ?? 'TB'}
          </Text>
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile?.business_name}</Text>
          {profile?.is_verified ? (
            <MaterialIcons
              name="verified"
              size={16}
              color={COLORS.primary400}
              style={styles.verifiedIcon}
            />
          ) : null}
        </View>
        <Text style={styles.rating}>★ {Number(profile?.rating ?? 0).toFixed(1)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business</Text>
        <Row label="Description" value={profile?.description ?? '—'} multiline />
        <Row
          label="Service radius"
          value={`${profile?.service_area_radius ?? 0} km`}
        />
        <Row
          label="Subscription plan"
          value={profile?.subscription_plan ?? 'free'}
          valueStyle={[
            styles.valueStrong,
            {
              color:
                profile?.subscription_plan === 'pro' ? COLORS.purple : COLORS.gray600,
            },
          ]}
        />
        <Row
          label="KYC status"
          value={kyc.replace('_', ' ')}
          valueStyle={[
            styles.valueStrong,
            { color: kyc === 'approved' ? COLORS.successText : COLORS.warningText },
          ]}
        />
        <Row
          label="WhatsApp"
          value={
            profile?.whatsapp_enabled
              ? profile?.whatsapp_number ?? 'Enabled'
              : 'Disabled'
          }
        />
        {profile?.website ? (
          <Row label="Website" value={profile.website} />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Row label="Name" value={user?.name ?? '—'} />
        <Row label="Email" value={user?.email ?? '—'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Work Tools</Text>
        <MenuRow
          icon="assignment"
          color={COLORS.primary}
          label="Requests & Quotes"
          onPress={() => navigation.navigate('VendorRequests')}
        />
        <MenuRow
          icon="event-note"
          color={COLORS.infoText}
          label="My Bookings"
          onPress={() => navigation.navigate('VendorBookings')}
        />
        <MenuRow
          icon="edit"
          color={COLORS.purple}
          label="Edit Business Profile"
          onPress={() => setShowEdit(true)}
        />
        <MenuRow
          icon="shopping-bag"
          color={COLORS.teal}
          label="Bundles"
          onPress={() => navigation.navigate('VendorBundles')}
        />
      </View>

      <VendorEditModal
        visible={showEdit}
        profile={profile}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false);
          load();
        }}
      />
    </ScrollView>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  multiline?: boolean;
  valueStyle?: object;
}> = ({ label, value, multiline, valueStyle }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text
      style={[styles.rowValue, valueStyle, multiline && styles.rowValueMultiline]}
      numberOfLines={multiline ? 4 : 2}
    >
      {value}
    </Text>
  </View>
);

const MenuRow: React.FC<{
  icon: string;
  color: string;
  label: string;
  onPress: () => void;
}> = ({ icon, color, label, onPress }) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress}>
    <MaterialIcons name={icon} size={20} color={color} />
    <Text style={styles.menuLabel}>{label}</Text>
    <MaterialIcons name="chevron-right" size={20} color={COLORS.gray300} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.gray900,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  name: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  rating: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.gray300,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    ...SHADOW.card,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
  },
  row: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rowValue: {
    marginTop: 2,
    fontSize: 14,
    color: COLORS.gray800,
    fontWeight: '500',
  },
  valueStrong: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  rowValueMultiline: {
    lineHeight: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray800,
  },
});

export default VendorProfileScreen;

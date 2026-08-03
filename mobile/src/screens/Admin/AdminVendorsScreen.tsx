import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import AdminHeader from '../../components/AdminHeader';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface AdminVendor {
  id: number;
  business_name: string;
  description?: string | null;
  rating: string | number;
  is_verified: boolean;
  is_featured?: boolean;
  services_count?: number;
  subscription_plan?: string | null;
  user?: { name?: string; email?: string } | null;
}

const PLANS = ['free', 'basic', 'pro'];

const AdminVendorsScreen: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AdminVendor | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/vendors', { params: { per_page: 100 } });
      setVendors(res.data.data ?? res.data);
    } catch (e) {
      console.warn('admin vendors load failed', e);
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

  const filtered = vendors.filter(v => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.business_name.toLowerCase().includes(q) ||
      (v.user?.name ?? '').toLowerCase().includes(q)
    );
  });

  const run = async (fn: () => Promise<void>, failMsg: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? failMsg);
    } finally {
      setBusy(false);
    }
  };

  const toggleVerify = () => {
    if (!selected) return;
    run(
      () => api.put(`/vendors/${selected.id}/verify`),
      'Could not update verification.',
    );
  };

  const toggleFeature = () => {
    if (!selected) return;
    run(
      () => api.put(`/vendors/${selected.id}/feature`),
      'Could not update feature flag.',
    );
  };

  const changePlan = (plan: string) => {
    if (!selected) return;
    run(
      () => api.put(`/vendors/${selected.id}/plan`, { plan }),
      'Could not change plan.',
    );
  };

  const removeVendor = () => {
    if (!selected) return;
    Alert.alert(
      'Delete vendor',
      `Delete ${selected.business_name}? All their services will be deactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            run(
              () => api.delete(`/vendors/${selected.id}`),
              'Could not delete vendor.',
            ),
        },
      ],
    );
  };

  const renderVendor = ({ item }: { item: AdminVendor }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => setSelected(item)}
    >
      <View style={styles.avatar}>
        <MaterialIcons name="storefront" size={18} color={COLORS.infoText} />
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.business_name}
          </Text>
          {item.is_verified ? (
            <MaterialIcons
              name="verified"
              size={14}
              color={COLORS.primary}
              style={styles.verified}
            />
          ) : null}
          {item.is_featured ? (
            <MaterialIcons name="star" size={14} color={COLORS.accent} />
          ) : null}
        </View>
        <Text style={styles.owner} numberOfLines={1}>
          {item.user?.name ?? '—'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>★ {Number(item.rating).toFixed(1)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{item.services_count ?? 0} services</Text>
          {item.subscription_plan ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>{item.subscription_plan}</Text>
            </>
          ) : null}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={COLORS.gray300} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AdminHeader title="Vendors" subtitle="Manage professionals" />

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color={COLORS.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search business or owner..."
          placeholderTextColor={COLORS.gray400}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={COLORS.gray400} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderVendor}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
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
          ListEmptyComponent={
            <EmptyState
              title="No vendors found"
              message="Try a different search or refresh."
            />
          }
        />
      )}

      <Modal
        visible={!!selected}
        title={selected?.business_name ?? ''}
        onClose={() => setSelected(null)}
      >
        <Text style={styles.userEmail}>
          {selected?.user?.name ?? '—'} · {selected?.user?.email ?? '—'}
        </Text>
        {selected?.description ? (
          <Text style={styles.desc} numberOfLines={3}>
            {selected.description}
          </Text>
        ) : null}

        <Text style={styles.label}>Status</Text>
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, selected?.is_verified && styles.chipActive]}
            onPress={toggleVerify}
            disabled={busy}
          >
            <MaterialIcons
              name="verified"
              size={14}
              color={selected?.is_verified ? COLORS.primary700 : COLORS.gray500}
            />
            <Text
              style={[
                styles.chipText,
                selected?.is_verified && styles.chipTextActive,
              ]}
            >
              {selected?.is_verified ? 'Verified' : 'Verify'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, selected?.is_featured && styles.chipActive]}
            onPress={toggleFeature}
            disabled={busy}
          >
            <MaterialIcons
              name="star"
              size={14}
              color={selected?.is_featured ? COLORS.accent : COLORS.gray500}
            />
            <Text
              style={[
                styles.chipText,
                selected?.is_featured && styles.chipTextActive,
              ]}
            >
              {selected?.is_featured ? 'Featured' : 'Feature'}
            </Text>
          </TouchableOpacity>
        </View>

        {isSuperAdmin ? (
          <>
            <Text style={styles.label}>Subscription plan</Text>
            <View style={styles.chipsRow}>
              {PLANS.map(plan => {
                const active = selected?.subscription_plan === plan;
                return (
                  <TouchableOpacity
                    key={plan}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => changePlan(plan)}
                    disabled={busy || active}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {plan}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.dangerBtn, busy && styles.btnDisabled]}
          onPress={removeVendor}
          disabled={busy}
        >
          <MaterialIcons name="delete-outline" size={16} color={COLORS.white} />
          <Text style={styles.dangerBtnText}>Delete vendor</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.gray900,
    paddingVertical: 0,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
    flexShrink: 1,
  },
  verified: {
    marginLeft: 4,
  },
  owner: {
    marginTop: 1,
    fontSize: 12,
    color: COLORS.gray500,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 11,
    color: COLORS.gray300,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  chipActive: {
    backgroundColor: COLORS.primary100,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: COLORS.primary700,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: COLORS.rose,
    borderRadius: RADIUS.md,
    height: 44,
  },
  dangerBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.gray500,
    marginBottom: SPACING.xs,
  },
  desc: {
    fontSize: 13,
    color: COLORS.gray600,
    marginTop: 2,
  },
});

export default AdminVendorsScreen;

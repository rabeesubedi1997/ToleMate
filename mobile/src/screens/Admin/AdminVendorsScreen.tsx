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
import { validateEmail, validatePhone, validatePasswordStrength } from '../../utils/security';
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

const FEATURE_LABELS: Record<string, string> = {
  bookings: 'Bookings',
  messaging: 'Messaging',
  services: 'Services',
  availability_edit: 'Edit own availability',
  social_links: 'Social links',
  reviews: 'Reviews',
  whatsapp: 'WhatsApp number',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DaySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const AdminVendorsScreen: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AdminVendor | null>(null);
  const [busy, setBusy] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [showAvailability, setShowAvailability] = useState(false);
  const [availDraft, setAvailDraft] = useState<DaySlot[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    business_name: '',
    description: '',
  });

  const createVendor = async () => {
    if (!newVendor.name.trim() || !newVendor.email.trim() || !newVendor.password) {
      Alert.alert('Missing fields', 'Name, email and password are required.');
      return;
    }
    if (!validateEmail(newVendor.email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    const pwd = validatePasswordStrength(newVendor.password);
    if (!pwd.valid) {
      Alert.alert('Weak password', pwd.errors.join('\n'));
      return;
    }
    if (newVendor.phone && !validatePhone(newVendor.phone)) {
      Alert.alert('Invalid phone', 'Phone must be a valid Nepali number (e.g. 98XXXXXXXX).');
      return;
    }
    setCreating(true);
    try {
      await api.post('/admin/users', { ...newVendor, role: 'vendor' });
      setShowCreate(false);
      setNewVendor({
        name: '',
        email: '',
        password: '',
        phone: '',
        business_name: '',
        description: '',
      });
      Alert.alert('Vendor created', 'A user account with the vendor role was created.');
      await load();
    } catch (e: any) {
      Alert.alert(
        'Failed',
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not create vendor.',
      );
    } finally {
      setCreating(false);
    }
  };

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

  const openFeatures = async () => {
    if (!selected) return;
    setShowFeatures(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/vendors/${selected.id}/features`);
      setFeatures(res.data?.features ?? {});
    } catch {
      Alert.alert('Failed', 'Could not load feature settings.');
      setShowFeatures(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleFeatureFlag = (key: string) =>
    setFeatures(f => ({ ...f, [key]: !f[key] }));

  const saveFeatures = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.put(`/admin/vendors/${selected.id}/features`, {
        features,
      });
      setShowFeatures(false);
      Alert.alert('Saved', 'Feature settings updated.');
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not save features.');
    } finally {
      setBusy(false);
    }
  };

  const openAvailability = async () => {
    if (!selected) return;
    setShowAvailability(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/vendors/${selected.id}/availability`);
      const list: DaySlot[] = res.data?.availability ?? [];
      setAvailDraft(
        list.map(d => ({
          day_of_week: d.day_of_week,
          start_time: d.start_time,
          end_time: d.end_time,
          is_available: d.is_available,
        })),
      );
    } catch {
      Alert.alert('Failed', 'Could not load availability.');
      setShowAvailability(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const saveAvailability = async () => {
    if (!selected) return;
    const bad = availDraft.find(
      d => !/^\d{2}:\d{2}$/.test(d.start_time) || !/^\d{2}:\d{2}$/.test(d.end_time),
    );
    if (bad) {
      Alert.alert('Invalid time', 'Times must be in HH:MM format (e.g. 09:00).');
      return;
    }
    setBusy(true);
    try {
      await api.put(`/admin/vendors/${selected.id}/availability`, {
        availability: availDraft,
      });
      setShowAvailability(false);
      Alert.alert('Saved', 'Availability updated.');
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not save availability.');
    } finally {
      setBusy(false);
    }
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

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          setShowCreate(true);
        }}
      >
        <MaterialIcons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Add vendor</Text>
      </TouchableOpacity>

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

        <View style={styles.detailRow}>
          <TouchableOpacity
            style={[styles.detailBtn, busy && styles.btnDisabled]}
            onPress={openFeatures}
            disabled={busy}
          >
            <MaterialIcons name="tune" size={16} color={COLORS.primary700} />
            <Text style={styles.detailBtnText}>Feature settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detailBtn, busy && styles.btnDisabled]}
            onPress={openAvailability}
            disabled={busy}
          >
            <MaterialIcons name="schedule" size={16} color={COLORS.primary700} />
            <Text style={styles.detailBtnText}>Availability</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.dangerBtn, busy && styles.btnDisabled]}
          onPress={removeVendor}
          disabled={busy}
        >
          <MaterialIcons name="delete-outline" size={16} color={COLORS.white} />
          <Text style={styles.dangerBtnText}>Delete vendor</Text>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showFeatures}
        title={`Feature settings · ${selected?.business_name ?? ''}`}
        onClose={() => setShowFeatures(false)}
      >
        {loadingDetail ? (
          <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
        ) : (
          <>
            {Object.keys(FEATURE_LABELS).map(key => (
              <TouchableOpacity
                key={key}
                style={styles.featureRow}
                onPress={() => toggleFeatureFlag(key)}
                disabled={busy}
              >
                <Text style={styles.featureLabel}>{FEATURE_LABELS[key]}</Text>
                <MaterialIcons
                  name={features[key] ? 'toggle-on' : 'toggle-off'}
                  size={30}
                  color={features[key] ? COLORS.primary : COLORS.gray400}
                />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={saveFeatures}
              disabled={busy}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? 'Saving...' : 'Save feature settings'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Modal>

      <Modal
        visible={showAvailability}
        title={`Availability · ${selected?.business_name ?? ''}`}
        onClose={() => setShowAvailability(false)}
      >
        {loadingDetail ? (
          <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
        ) : (
          <>
            {availDraft.map((d, i) => (
              <View key={d.day_of_week} style={styles.dayRow}>
                <TouchableOpacity
                  style={styles.dayToggle}
                  onPress={() =>
                    setAvailDraft(prev =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, is_available: !x.is_available } : x,
                      ),
                    )
                  }
                  disabled={busy}
                >
                  <MaterialIcons
                    name={d.is_available ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={d.is_available ? COLORS.primary : COLORS.gray400}
                  />
                  <Text
                    style={[
                      styles.dayLabel,
                      !d.is_available && styles.dayLabelOff,
                    ]}
                  >
                    {DAY_LABELS[d.day_of_week]}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.timeInput, !d.is_available && styles.timeInputOff]}
                  value={d.start_time}
                  onChangeText={t =>
                    setAvailDraft(prev =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, start_time: t } : x,
                      ),
                    )
                  }
                  placeholder="09:00"
                  placeholderTextColor={COLORS.gray400}
                  autoCapitalize="none"
                  editable={d.is_available && !busy}
                  maxLength={5}
                />
                <Text style={styles.dash}>–</Text>
                <TextInput
                  style={[styles.timeInput, !d.is_available && styles.timeInputOff]}
                  value={d.end_time}
                  onChangeText={t =>
                    setAvailDraft(prev =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, end_time: t } : x,
                      ),
                    )
                  }
                  placeholder="17:00"
                  placeholderTextColor={COLORS.gray400}
                  autoCapitalize="none"
                  editable={d.is_available && !busy}
                  maxLength={5}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={saveAvailability}
              disabled={busy}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? 'Saving...' : 'Save availability'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Modal>

      <Modal
        visible={showCreate}
        title="Add New Vendor"
        onClose={() => setShowCreate(false)}
      >
        <Text style={styles.note}>
          A user account with the <Text style={styles.noteStrong}>vendor</Text> role
          will be created along with a vendor profile.
        </Text>
        <Text style={styles.fieldLabel}>Full name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ram Shrestha"
          placeholderTextColor={COLORS.gray400}
          value={newVendor.name}
          onChangeText={t => setNewVendor(v => ({ ...v, name: t }))}
        />
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="vendor@example.com"
          placeholderTextColor={COLORS.gray400}
          value={newVendor.email}
          onChangeText={t => setNewVendor(v => ({ ...v, email: t }))}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="8+ chars, upper/lower, number, symbol"
          placeholderTextColor={COLORS.gray400}
          value={newVendor.password}
          onChangeText={t => setNewVendor(v => ({ ...v, password: t }))}
          secureTextEntry
        />
        <Text style={styles.fieldLabel}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="98XXXXXXXX"
          placeholderTextColor={COLORS.gray400}
          value={newVendor.phone}
          onChangeText={t => setNewVendor(v => ({ ...v, phone: t }))}
          keyboardType="phone-pad"
        />
        <Text style={styles.fieldLabel}>Business name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sparkling Clean Services"
          placeholderTextColor={COLORS.gray400}
          value={newVendor.business_name}
          onChangeText={t => setNewVendor(v => ({ ...v, business_name: t }))}
        />
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="What services does this vendor offer?"
          placeholderTextColor={COLORS.gray400}
          value={newVendor.description}
          onChangeText={t => setNewVendor(v => ({ ...v, description: t }))}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, creating && styles.btnDisabled]}
          onPress={createVendor}
          disabled={creating}
        >
          <Text style={styles.primaryBtnText}>
            {creating ? 'Creating...' : 'Create vendor'}
          </Text>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 42,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    color: COLORS.gray600,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  noteStrong: {
    fontWeight: '700',
    color: COLORS.gray800,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.md,
    height: 44,
    fontSize: 14,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 76,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
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
  detailRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary100,
    borderRadius: RADIUS.md,
    height: 44,
  },
  detailBtnText: {
    color: COLORS.primary700,
    fontSize: 13,
    fontWeight: '700',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  primaryBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: SPACING.xs,
  },
  dayToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  dayLabelOff: {
    color: COLORS.gray400,
  },
  timeInput: {
    width: 62,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 6,
    height: 36,
    fontSize: 13,
    color: COLORS.gray900,
    textAlign: 'center',
  },
  timeInputOff: {
    opacity: 0.4,
  },
  dash: {
    fontSize: 14,
    color: COLORS.gray400,
  },
});

export default AdminVendorsScreen;

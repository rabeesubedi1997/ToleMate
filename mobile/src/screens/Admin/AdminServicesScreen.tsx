import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Service {
  id: number;
  name: string;
  price: string;
  sale_price?: string | null;
  pricing_type: string;
  status: string;
  is_active: boolean;
  created_at: string;
  category?: { id: number; name?: string } | null;
  vendor?: { id: number; business_name?: string } | null;
}

interface Category {
  id: number;
  name: string;
}

interface VendorOption {
  id: number;
  business_name: string;
  user?: { name?: string } | null;
}

const STATUSES = ['all', 'pending', 'approved', 'rejected', 'draft'];

const PRICING_TYPES = [
  { key: 'fixed', label: 'Fixed' },
  { key: 'hourly', label: 'Hourly' },
  { key: 'quote', label: 'Quote' },
];

const EMPTY_FORM = {
  name: '',
  vendor_id: '',
  category_id: '',
  pricing_type: 'fixed',
  price: '',
  sale_price: '',
  description: '',
  cancellation_policy: '',
  is_active: true,
};

const AdminServicesScreen: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { per_page: '100' };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/services', { params });
      setServices(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('admin services load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openCreate = useCallback(async () => {
    setShowCreate(true);
    setForm(EMPTY_FORM);
    try {
      const [catRes, vendorRes] = await Promise.all([
        api.get('/categories'),
        api.get('/admin/vendors', { params: { per_page: 100 } }),
      ]);
      setCategories(catRes.data ?? []);
      setVendors(vendorRes.data.data ?? vendorRes.data ?? []);
    } catch {
      setCategories([]);
      setVendors([]);
    }
  }, []);

  const createService = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      Alert.alert('Missing fields', 'Name and description are required.');
      return;
    }
    if (!form.category_id) {
      Alert.alert('Missing fields', 'Please select a category.');
      return;
    }
    if (!form.vendor_id) {
      Alert.alert('Missing fields', 'Please select a vendor.');
      return;
    }
    if (form.pricing_type !== 'quote' && !form.price) {
      Alert.alert('Missing fields', 'Please enter a price.');
      return;
    }
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) <= 0)) {
      Alert.alert('Invalid price', 'Price must be a positive number.');
      return;
    }
    if (form.sale_price && (isNaN(Number(form.sale_price)) || Number(form.sale_price) <= 0)) {
      Alert.alert('Invalid sale price', 'Sale price must be a positive number.');
      return;
    }
    if (
      form.price &&
      form.sale_price &&
      Number(form.sale_price) >= Number(form.price)
    ) {
      Alert.alert('Invalid prices', 'Sale price must be lower than the regular price.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/services', {
        name: form.name.trim(),
        description: form.description.trim(),
        category_id: Number(form.category_id),
        vendor_id: Number(form.vendor_id),
        pricing_type: form.pricing_type,
        price: form.pricing_type === 'quote' ? null : Number(form.price),
        sale_price: form.sale_price ? Number(form.sale_price) : undefined,
        cancellation_policy: form.cancellation_policy || undefined,
        is_active: form.is_active,
      });
      setShowCreate(false);
      Alert.alert('Service created', 'The service is live and approved.');
      load();
    } catch (e: any) {
      Alert.alert(
        'Failed',
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not create service.',
      );
    } finally {
      setCreating(false);
    }
  };

  const remove = (item: Service) => {
    Alert.alert('Delete service', `Delete "${item.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/services/${item.id}`);
            load();
          } catch (e: any) {
            Alert.alert(
              'Failed',
              e?.response?.data?.message ?? 'Could not delete service.',
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Service }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {item.vendor?.business_name ?? '—'} · {item.category?.name ?? '—'}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={styles.price}>Rs {item.price}</Text>
        <View style={styles.actions}>
          <View style={styles.activeRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: item.is_active ? COLORS.successText : COLORS.gray400 },
              ]}
            />
            <Text style={styles.activeText}>
              {item.is_active ? 'live' : 'hidden'}
            </Text>
          </View>
          <Pressable
            onPress={() => remove(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.time}>{item.pricing_type}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Services" subtitle="All services on the platform" />
      <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
        <MaterialIcons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Add service</Text>
      </TouchableOpacity>
      <FilterChips options={STATUSES} selected={filter} onSelect={setFilter} />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={services}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
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
            <EmptyState title="No services" message="No services match this filter." />
          }
        />
      )}

      <Modal
        visible={showCreate}
        title="Add New Service"
        onClose={() => setShowCreate(false)}
      >
        <Text style={styles.fieldLabel}>Service title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Professional Sofa Deep Cleaning"
          placeholderTextColor={COLORS.gray400}
          value={form.name}
          onChangeText={t => setForm(f => ({ ...f, name: t }))}
        />

        <Text style={styles.fieldLabel}>Vendor *</Text>
        {vendors.length === 0 ? (
          <Text style={styles.warn}>
            No vendors found. Please add a vendor profile first.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {vendors.map(v => {
              const active = form.vendor_id === String(v.id);
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setForm(f => ({ ...f, vendor_id: String(v.id) }))}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {v.business_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.fieldLabel}>Category *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {categories.map(c => {
            const active = form.category_id === String(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setForm(f => ({ ...f, category_id: String(c.id) }))}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.fieldLabel}>Pricing model</Text>
        <View style={styles.chipsRow}>
          {PRICING_TYPES.map(p => {
            const active = form.pricing_type === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setForm(f => ({ ...f, pricing_type: p.key }))}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.row2}>
          <View style={styles.row2Item}>
            <Text style={styles.fieldLabel}>
              Price (Rs.) {form.pricing_type === 'quote' ? '(optional)' : '*'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={COLORS.gray400}
              value={form.price}
              onChangeText={t => setForm(f => ({ ...f, price: t }))}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.row2Item}>
            <Text style={styles.fieldLabel}>Sale price (Rs.)</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor={COLORS.gray400}
              value={form.sale_price}
              onChangeText={t => setForm(f => ({ ...f, sale_price: t }))}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Description *</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Describe your service..."
          placeholderTextColor={COLORS.gray400}
          value={form.description}
          onChangeText={t => setForm(f => ({ ...f, description: t }))}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.fieldLabel}>Cancellation policy (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="e.g. Free cancellation up to 24 hours before the scheduled time"
          placeholderTextColor={COLORS.gray400}
          value={form.cancellation_policy}
          onChangeText={t => setForm(f => ({ ...f, cancellation_policy: t }))}
          multiline
          numberOfLines={2}
        />

        <TouchableOpacity
          style={styles.activeToggle}
          onPress={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
        >
          <MaterialIcons
            name={form.is_active ? 'toggle-on' : 'toggle-off'}
            size={30}
            color={form.is_active ? COLORS.primary : COLORS.gray400}
          />
          <Text style={styles.activeLabel}>
            {form.is_active ? 'Active & visible' : 'Hidden'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, creating && styles.btnDisabled]}
          onPress={createService}
          disabled={creating}
        >
          <Text style={styles.saveBtnText}>
            {creating ? 'Creating...' : 'Create service'}
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
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  meta: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  activeText: {
    fontSize: 11,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  time: {
    marginTop: SPACING.xs,
    fontSize: 11,
    color: COLORS.gray400,
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
    height: 88,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
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
  },
  chipTextActive: {
    color: COLORS.primary700,
  },
  warn: {
    fontSize: 12,
    color: COLORS.roseText,
    backgroundColor: COLORS.roseBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  row2: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  row2Item: {
    flex: 1,
  },
  activeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  activeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  saveBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdminServicesScreen;

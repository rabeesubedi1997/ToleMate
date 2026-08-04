import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import AppImage from '../../components/AppImage';
import { COLORS, SPACING, RADIUS, SHADOW, FONT_SIZE } from '../../theme';

interface VendorService {
  id: number;
  name: string;
  description?: string | null;
  price?: string | number | null;
  sale_price?: string | number | null;
  pricing_type?: string | null;
  status: string;
  is_active: boolean;
  bookings_count?: number;
  category_id?: number;
  category?: { id: number; name?: string } | null;
  images?: { id: number; file_path: string }[];
  cancellation_policy?: string | null;
  tags?: string[] | null;
}

interface Category {
  id: number;
  name: string;
}

const PRICING_TYPES = [
  { key: 'fixed', label: 'Fixed' },
  { key: 'hourly', label: 'Hourly' },
  { key: 'quote', label: 'Quote' },
];

const EMPTY_FORM = {
  name: '',
  category_id: '',
  pricing_type: 'fixed',
  price: '',
  sale_price: '',
  description: '',
  cancellation_policy: '',
  tags: '',
  is_active: true,
};

const VendorServicesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<VendorService[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VendorService | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/services', { params: { per_page: 100 } });
      setServices(res.data.data ?? res.data);
    } catch (e) {
      console.warn('vendor services load failed', e);
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

  const openCreate = async () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data ?? []);
    } catch {
      setCategories([]);
    }
  };

  const openEdit = (item: VendorService) => {
    setEditing(item);
    setForm({
      name: item.name,
      category_id: item.category_id ? String(item.category_id) : '',
      pricing_type: item.pricing_type ?? 'fixed',
      price: item.price != null ? String(item.price) : '',
      sale_price: item.sale_price != null ? String(item.sale_price) : '',
      description: item.description ?? '',
      cancellation_policy: item.cancellation_policy ?? '',
      tags: (item.tags ?? []).join(', '),
      is_active: item.is_active,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      Alert.alert('Missing fields', 'Name and description are required.');
      return;
    }
    if (!form.category_id) {
      Alert.alert('Missing fields', 'Please select a category.');
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

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category_id: Number(form.category_id),
      pricing_type: form.pricing_type,
      price: form.pricing_type === 'quote' ? null : Number(form.price),
      sale_price: form.sale_price ? Number(form.sale_price) : undefined,
      cancellation_policy: form.cancellation_policy.trim() || undefined,
      tags: form.tags
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : undefined,
      is_active: form.is_active,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/services/${editing.id}`, payload);
        Alert.alert('Saved', 'Service updated.');
      } else {
        await api.post('/services', payload);
        Alert.alert('Service created', 'Your service is pending review by admins.');
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      Alert.alert(
        'Failed',
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not save service.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (item: VendorService) => {
    Alert.alert(
      item.is_active ? 'Hide service' : 'Activate service',
      `${item.is_active ? 'Hide' : 'Show'} "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.is_active ? 'Hide' : 'Activate',
          onPress: async () => {
            try {
              await api.put(`/services/${item.id}`, { is_active: !item.is_active });
              load();
            } catch (e: any) {
              Alert.alert('Failed', e?.response?.data?.message ?? 'Could not update service.');
            }
          },
        },
      ],
    );
  };

  const remove = (item: VendorService) => {
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
            Alert.alert('Failed', e?.response?.data?.message ?? 'Could not delete service.');
          }
        },
      },
    ]);
  };

  const renderService = ({ item }: { item: VendorService }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => openEdit(item)}
    >
      <AppImage uri={item.images?.[0]?.file_path ?? null} style={styles.thumb} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.price}>
          {item.price != null ? `Rs ${item.price}` : 'Price on request'}
          {item.pricing_type ? ` · ${item.pricing_type}` : ''}
        </Text>
        {item.bookings_count != null ? (
          <Text style={styles.meta}>{item.bookings_count} bookings</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <StatusBadge status={item.status} />
        <View style={styles.activeRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: item.is_active ? COLORS.successText : COLORS.gray400 },
            ]}
          />
          <Text style={styles.activeText}>
            {item.is_active ? 'live' : 'offline'}
          </Text>
        </View>
        <View style={styles.iconRow}>
          <TouchableOpacity onPress={() => toggleActive(item)} hitSlop={6}>
            <MaterialIcons
              name={item.is_active ? 'visibility-off' : 'visibility'}
              size={18}
              color={COLORS.gray500}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(item)} hitSlop={6}>
            <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <View>
          <Text style={styles.title}>My Services</Text>
          <Text style={styles.count}>{services.length} total</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <MaterialIcons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={services}
          keyExtractor={item => String(item.id)}
          renderItem={renderService}
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
            <EmptyState
              title="No services yet"
              message="Tap Add to create your first service."
            />
          }
        />
      )}

      <Modal
        visible={showForm}
        title={editing ? 'Edit Service' : 'Add Service'}
        onClose={() => setShowForm(false)}
      >
        <ScrollView>
          <Text style={styles.fieldLabel}>Service title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sofa Deep Cleaning"
            placeholderTextColor={COLORS.gray400}
            value={form.name}
            onChangeText={t => setForm(f => ({ ...f, name: t }))}
          />

          <Text style={styles.fieldLabel}>Category *</Text>
          <View style={styles.chipsRow}>
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
          </View>

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

          <Text style={styles.fieldLabel}>Tags (comma separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="cleaning, sofa, home"
            placeholderTextColor={COLORS.gray400}
            value={form.tags}
            onChangeText={t => setForm(f => ({ ...f, tags: t }))}
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Cancellation policy (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="e.g. Free cancellation up to 24 hours before"
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
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>
                {editing ? 'Save changes' : 'Create service'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  count: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '600',
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 38,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    padding: SPACING.md,
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
  thumb: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray100,
  },
  body: {
    flex: 1,
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  price: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  meta: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.gray500,
  },
  right: {
    alignItems: 'flex-end',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  activeText: {
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  iconRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 6,
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
    height: 84,
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

export default VendorServicesScreen;

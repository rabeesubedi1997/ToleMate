import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Bundle {
  id: number;
  name: string;
  description?: string | null;
  bundle_price: number | string;
  discount_percent?: number | null;
  is_active: boolean;
  services?: { id: number; name: string; price?: number | string | null }[];
}

interface MyService {
  id: number;
  name: string;
  price?: string | number | null;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  service_ids: [] as number[],
  bundle_price: '',
  discount_percent: '',
};

const VendorBundlesScreen: React.FC = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [myServices, setMyServices] = useState<MyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Bundle | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [bundleRes, serviceRes] = await Promise.all([
        api.get('/vendor/bundles'),
        api.get('/services', { params: { per_page: 100 } }),
      ]);
      setBundles(bundleRes.data.bundles ?? bundleRes.data ?? []);
      setMyServices(serviceRes.data.data ?? serviceRes.data ?? []);
    } catch (e) {
      console.warn('vendor bundles load failed', e);
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

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const toggleService = (id: number) => {
    setForm(f => ({
      ...f,
      service_ids: f.service_ids.includes(id)
        ? f.service_ids.filter(x => x !== id)
        : [...f.service_ids, id],
    }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Bundle name is required.');
      return;
    }
    if (form.service_ids.length < 2) {
      toast.error('Select at least 2 services for the bundle.');
      return;
    }
    if (!form.bundle_price || Number(form.bundle_price) <= 0) {
      toast.error('Enter a bundle price.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/vendor/bundles', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        service_ids: form.service_ids,
        bundle_price: Number(form.bundle_price),
        discount_percent: form.discount_percent
          ? Number(form.discount_percent)
          : 0,
      });
      toast.success('Bundle created.');
      setShowForm(false);
      load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not create bundle.',
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    api
      .delete(`/vendor/bundles/${toDelete.id}`)
      .then(() => {
        toast.success('Bundle deleted.');
        setToDelete(null);
        load();
      })
      .catch((e: any) => {
        toast.error(e?.response?.data?.message ?? 'Could not delete bundle.');
        setToDelete(null);
      });
  };

  const renderBundle = ({ item }: { item: Bundle }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <TouchableOpacity onPress={() => setToDelete(item)} hitSlop={6}>
          <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
        </TouchableOpacity>
      </View>
      {item.description ? (
        <Text style={styles.desc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <Text style={styles.price}>
        Rs {item.bundle_price}
        {item.discount_percent ? ` · ${item.discount_percent}% off` : ''}
      </Text>
      {item.services && item.services.length > 0 ? (
        <View style={styles.servicesRow}>
          {item.services.map(s => (
            <View key={s.id} style={styles.serviceChip}>
              <Text style={styles.serviceChipText} numberOfLines={1}>
                {s.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ToleMate</Text>
          <Text style={styles.title}>Bundles</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <MaterialIcons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={bundles}
          keyExtractor={item => String(item.id)}
          renderItem={renderBundle}
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
              title="No bundles yet"
              message="Bundle 2+ services with a combined price to attract more customers."
            />
          }
        />
      )}

      <Modal
        visible={showForm}
        title="Create Bundle"
        onClose={() => setShowForm(false)}
      >
        <ScrollView>
          <Text style={styles.label}>Bundle name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Home Cleaning Combo"
            placeholderTextColor={COLORS.gray400}
            value={form.name}
            onChangeText={t => setForm(f => ({ ...f, name: t }))}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="What's included in this combo?"
            placeholderTextColor={COLORS.gray400}
            value={form.description}
            onChangeText={t => setForm(f => ({ ...f, description: t }))}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Include services (select 2+) *</Text>
          <View style={styles.chipsWrap}>
            {myServices.map(s => {
              const active = form.service_ids.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleService(s.id)}
                >
                  <MaterialIcons
                    name={active ? 'check-box' : 'check-box-outline-blank'}
                    size={16}
                    color={active ? COLORS.primary : COLORS.gray400}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.row2}>
            <View style={styles.row2Item}>
              <Text style={styles.label}>Bundle price (Rs.) *</Text>
              <TextInput
                style={styles.input}
                placeholder="1500"
                placeholderTextColor={COLORS.gray400}
                value={form.bundle_price}
                onChangeText={t => setForm(f => ({ ...f, bundle_price: t }))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.row2Item}>
              <Text style={styles.label}>Discount %</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={COLORS.gray400}
                value={form.discount_percent}
                onChangeText={t => setForm(f => ({ ...f, discount_percent: t }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>Create bundle</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <ConfirmDialog
        visible={toDelete !== null}
        title="Delete bundle"
        message={`Delete "${toDelete?.name}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    height: 38,
    ...SHADOW.card,
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  desc: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.gray500,
    lineHeight: 17,
  },
  price: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  serviceChip: {
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceChipText: {
    fontSize: 11,
    color: COLORS.gray600,
    fontWeight: '600',
    maxWidth: 140,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gray600,
    marginTop: SPACING.sm,
    marginBottom: 6,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    height: 46,
    fontSize: 14,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
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
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray600,
    maxWidth: 150,
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
  saveBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
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

export default VendorBundlesScreen;

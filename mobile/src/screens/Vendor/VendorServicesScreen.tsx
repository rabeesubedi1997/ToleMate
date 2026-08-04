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
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import AppImage from '../../components/AppImage';
import { COLORS, SPACING, RADIUS, SHADOW, FONT_SIZE } from '../../theme';
import { validateFile } from '../../utils/security';

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
  packages?: ServicePackage[];
}

interface ServicePackage {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  delivery_days?: number | null;
  features?: string[] | null;
  is_active?: boolean;
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

const EMPTY_PKG = {
  name: '',
  price: '',
  delivery_days: '',
  description: '',
  features: '',
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
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverLocal, setCoverLocal] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [pkgForm, setPkgForm] = useState(EMPTY_PKG);
  const [editingPkg, setEditingPkg] = useState<ServicePackage | null>(null);
  const [pkgBusy, setPkgBusy] = useState(false);

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
    setCoverUri(null);
    setCoverLocal(null);
    setPackages([]);
    setShowForm(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data ?? []);
    } catch {
      setCategories([]);
    }
  };

  const openEdit = async (item: VendorService) => {
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
    setCoverUri(item.images?.[0]?.file_path ?? null);
    setCoverLocal(null);
    setPackages(item.packages ?? []);
    setShowForm(true);
    api
      .get(`/services/${item.id}`)
      .then(res => {
        const svc = res.data.service ?? res.data ?? {};
        setPackages(svc.packages ?? []);
      })
      .catch(() => {});
  };

  const uploadCover = async () => {
    if (!editing) {
      Alert.alert('Save first', 'Create the service, then upload a cover photo.');
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    const check = validateFile(
      { name: asset.fileName ?? '', size: asset.fileSize ?? 0, type: asset.type ?? '' },
      ['image/jpeg', 'image/png', 'image/webp'],
      4,
    );
    if (!check.valid) {
      Alert.alert('Invalid image', check.error ?? 'File not allowed');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName ?? `photo_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
      } as any);
      await api.post(`/services/${editing.id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCoverLocal(asset.uri);
      Alert.alert('Uploaded', 'Cover photo updated.');
      load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const savePkg = async () => {
    if (!editing) return;
    if (!pkgForm.name.trim()) {
      Alert.alert('Missing', 'Tier name is required.');
      return;
    }
    if (!pkgForm.price || Number(pkgForm.price) <= 0) {
      Alert.alert('Missing', 'Enter a tier price.');
      return;
    }
    setPkgBusy(true);
    try {
      const payload = {
        name: pkgForm.name.trim(),
        price: Number(pkgForm.price),
        delivery_days: pkgForm.delivery_days
          ? Number(pkgForm.delivery_days)
          : undefined,
        description: pkgForm.description.trim() || undefined,
        features: pkgForm.features
          ? pkgForm.features.split('\n').map(f => f.trim()).filter(Boolean)
          : undefined,
        sort_order: editingPkg ? packages.indexOf(editingPkg) : packages.length,
      };
      if (editingPkg) {
        await api.put(`/services/${editing.id}/packages/${editingPkg.id}`, payload);
      } else {
        await api.post(`/services/${editing.id}/packages`, payload);
      }
      setPkgForm(EMPTY_PKG);
      setEditingPkg(null);
      const res = await api.get(`/services/${editing.id}`);
      setPackages(res.data.service?.packages ?? []);
    } catch (e: any) {
      Alert.alert(
        'Failed',
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not save tier.',
      );
    } finally {
      setPkgBusy(false);
    }
  };

  const startEditPkg = (pkg: ServicePackage) => {
    setEditingPkg(pkg);
    setPkgForm({
      name: pkg.name,
      price: String(pkg.price ?? ''),
      delivery_days: pkg.delivery_days != null ? String(pkg.delivery_days) : '',
      description: pkg.description ?? '',
      features: (pkg.features ?? []).join('\n'),
    });
  };

  const removePkg = (pkg: ServicePackage) => {
    if (!editing) return;
    Alert.alert('Delete tier', `Delete "${pkg.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/services/${editing.id}/packages/${pkg.id}`);
            setPackages(prev => prev.filter(p => p.id !== pkg.id));
          } catch (e: any) {
            Alert.alert('Failed', e?.response?.data?.message ?? 'Could not delete tier.');
          }
        },
      },
    ]);
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

          <Text style={styles.fieldLabel}>Cover photo</Text>
          <View style={styles.coverRow}>
            {coverLocal ? (
              <Image source={{ uri: coverLocal }} style={styles.coverPreview} />
            ) : (
              <AppImage uri={coverUri} style={styles.coverPreview} />
            )}
            <TouchableOpacity
              style={[styles.coverBtn, uploading && styles.btnDisabled]}
              onPress={uploadCover}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <MaterialIcons name="photo-camera" size={18} color={COLORS.primary} />
                  <Text style={styles.coverBtnText}>
                    {coverUri || coverLocal ? 'Change photo' : 'Upload photo'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {!editing ? (
            <Text style={styles.hint}>
              Save the service first, then tap edit to upload a cover photo.
            </Text>
          ) : null}

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

          {/* Pricing tiers */}
          {editing ? (
            <View style={styles.pkgsBlock}>
              <Text style={styles.fieldLabel}>PRICING TIERS ({packages.length}/3)</Text>
              {packages.map(pkg => (
                <View key={pkg.id} style={styles.pkgRow}>
                  <View style={styles.pkgBody}>
                    <Text style={styles.pkgName} numberOfLines={1}>
                      {pkg.name}
                    </Text>
                    <Text style={styles.pkgMeta}>
                      Rs {pkg.price}
                      {pkg.delivery_days ? ` · ${pkg.delivery_days}d delivery` : ''}
                    </Text>
                    {(pkg.features ?? []).slice(0, 2).map((f, i) => (
                      <Text key={i} style={styles.pkgFeature} numberOfLines={1}>
                        • {f}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.pkgActions}>
                    <TouchableOpacity onPress={() => startEditPkg(pkg)} hitSlop={6}>
                      <MaterialIcons name="edit-outline" size={18} color={COLORS.primary700} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removePkg(pkg)} hitSlop={6}>
                      <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {packages.length < 3 ? (
                <>
                  <Text style={styles.fieldLabel}>
                    {editingPkg ? `Edit "${editingPkg.name}"` : 'New tier'}
                  </Text>
                  <View style={styles.row2}>
                    <View style={styles.row2Item}>
                      <Text style={styles.fieldLabel}>Tier name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={
                          packages.length === 0
                            ? 'Basic'
                            : packages.length === 1
                              ? 'Standard'
                              : 'Premium'
                        }
                        placeholderTextColor={COLORS.gray400}
                        value={pkgForm.name}
                        onChangeText={t => setPkgForm(f => ({ ...f, name: t }))}
                      />
                    </View>
                    <View style={styles.row2Item}>
                      <Text style={styles.fieldLabel}>Price (Rs.)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.gray400}
                        value={pkgForm.price}
                        onChangeText={t => setPkgForm(f => ({ ...f, price: t }))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.row2}>
                    <View style={styles.row2Item}>
                      <Text style={styles.fieldLabel}>Delivery days</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Optional"
                        placeholderTextColor={COLORS.gray400}
                        value={pkgForm.delivery_days}
                        onChangeText={t => setPkgForm(f => ({ ...f, delivery_days: t }))}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.row2Item}>
                      <Text style={styles.fieldLabel}>Short description</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Optional"
                        placeholderTextColor={COLORS.gray400}
                        value={pkgForm.description}
                        onChangeText={t => setPkgForm(f => ({ ...f, description: t }))}
                      />
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>Features (one per line)</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    placeholder={'Deep clean\nStain removal\nFree touch-up'}
                    placeholderTextColor={COLORS.gray400}
                    value={pkgForm.features}
                    onChangeText={t => setPkgForm(f => ({ ...f, features: t }))}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.pkgFormActions}>
                    {editingPkg ? (
                      <TouchableOpacity
                        style={[styles.pkgCancelBtn, pkgBusy && styles.btnDisabled]}
                        disabled={pkgBusy}
                        onPress={() => {
                          setEditingPkg(null);
                          setPkgForm(EMPTY_PKG);
                        }}
                      >
                        <Text style={styles.pkgCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.pkgAddBtn, pkgBusy && styles.btnDisabled]}
                      disabled={pkgBusy}
                      onPress={savePkg}
                    >
                      {pkgBusy ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={styles.pkgAddText}>
                          {editingPkg ? 'Update tier' : 'Add tier'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

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
  hint: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.gray500,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  coverPreview: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray100,
  },
  coverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 40,
  },
  coverBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pkgsBlock: {
    marginTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
    paddingTop: SPACING.sm,
  },
  pkgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  pkgBody: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  pkgName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  pkgMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pkgFeature: {
    marginTop: 1,
    fontSize: 11,
    color: COLORS.gray500,
  },
  pkgActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  pkgFormActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  pkgAddBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgAddText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  pkgCancelBtn: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pkgCancelText: {
    color: COLORS.gray600,
    fontSize: 13,
    fontWeight: '600',
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

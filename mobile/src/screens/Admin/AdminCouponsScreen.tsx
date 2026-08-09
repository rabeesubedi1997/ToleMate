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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';

interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount?: number | null;
  max_uses?: number | null;
  used_count: number;
  expires_at?: string | null;
  is_active: boolean;
  description?: string | null;
}

const AdminCouponsScreen: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    min_order: '0',
    max_discount: '',
    max_uses: '',
    expires_at: '',
    description: '',
  });
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    tone?: 'danger' | 'primary' | 'warning';
    confirmLabel?: string;
    icon?: string;
    fn?: () => void;
  } | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/coupons');
      setCoupons(res.data ?? []);
    } catch (e) {
      console.warn('admin coupons load failed', e);
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

  const toggleActive = async (coupon: Coupon) => {
    try {
      await api.put(`/admin/coupons/${coupon.id}`, {
        is_active: !coupon.is_active,
      });
      load();
    } catch {
      toast.error('Could not update coupon.');
    }
  };

  const remove = (coupon: Coupon) => {
    setConfirm({
      title: 'Delete coupon',
      message: `Delete ${coupon.code}?`,
      tone: 'danger',
      confirmLabel: 'Delete',
      icon: 'delete-outline',
      fn: async () => {
        try {
          await api.delete(`/admin/coupons/${coupon.id}`);
          load();
        } catch {
          toast.error('Could not delete coupon.');
        }
      },
    });
  };

  const createCoupon = async () => {
    if (!form.code.trim()) {
      toast.error('Enter a coupon code.');
      return;
    }
    const value = parseFloat(form.discount_value);
    if (isNaN(value) || value <= 0) {
      toast.error('Enter a valid discount value.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/coupons', {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: value,
        min_order: parseFloat(form.min_order) || 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
        max_uses: form.max_uses ? parseInt(form.max_uses, 10) : undefined,
        expires_at: form.expires_at ? `${form.expires_at} 23:59:59` : undefined,
        description: form.description || undefined,
      });
      setShowCreate(false);
      setForm({
        code: '',
        discount_type: 'percent',
        discount_value: '',
        min_order: '0',
        max_discount: '',
        max_uses: '',
        expires_at: '',
        description: '',
      });
      load();
      toast.success('Coupon created.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not create coupon.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Coupon }) => {
    const expired =
      item.expires_at && new Date(item.expires_at).getTime() < Date.now();
    const discount =
      item.discount_type === 'percent'
        ? `${item.discount_value}%`
        : `Rs ${item.discount_value}`;
    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.code}>{item.code}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.iconBtnToggle, !item.is_active && styles.iconBtnToggleOff]}
              onPress={() => toggleActive(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialIcons
                name={item.is_active ? 'toggle-on' : 'toggle-off'}
                size={18}
                color={item.is_active ? COLORS.primary700 : COLORS.gray400}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtnDelete}
              onPress={() => remove(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.discount}>{discount}</Text>
        <Text style={styles.meta} numberOfLines={2}>
          Min order Rs {item.min_order}
          {item.max_discount ? ` · max Rs ${item.max_discount}` : ''} · Used{' '}
          {item.used_count}
          {item.max_uses ? `/${item.max_uses}` : ''}
        </Text>
        <View style={styles.bottomRow}>
          {expired ? (
            <View style={styles.expiredPill}>
              <Text style={styles.expiredText}>expired</Text>
            </View>
          ) : (
            <View style={styles.onPill}>
              <Text style={styles.onText}>{item.is_active ? 'active' : 'disabled'}</Text>
            </View>
          )}
          <Text style={styles.date}>
            {item.expires_at
              ? `Expires ${new Date(item.expires_at).toLocaleDateString()}`
              : 'No expiry'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Coupons" subtitle="Discount codes" />

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
        <MaterialIcons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Create coupon</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          style={styles.flatList}
          data={coupons}
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
            <EmptyState title="No coupons" message="Coupons will appear here." />
          }
        />
      )}

      <Modal
        visible={showCreate}
        title="Create coupon"
        subtitle="Discount codes for customers"
        icon="local-offer"
        onClose={() => setShowCreate(false)}
      >
        <Text style={styles.fieldLabel}>Coupon code *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. WELCOME10"
          placeholderTextColor={COLORS.gray400}
          value={form.code}
          onChangeText={t => setForm(f => ({ ...f, code: t }))}
          autoCapitalize="characters"
        />
        <Text style={styles.fieldLabel}>Discount type</Text>
        <View style={styles.chipsRow}>
          {['percent', 'flat'].map(type => {
            const active = form.discount_type === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setForm(f => ({ ...f, discount_type: type }))}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {type === 'percent' ? '% Percentage' : 'Rs Fixed'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fieldLabel}>Discount value *</Text>
        <TextInput
          style={styles.input}
          placeholder={form.discount_type === 'percent' ? '10' : '500'}
          placeholderTextColor={COLORS.gray400}
          value={form.discount_value}
          onChangeText={t => setForm(f => ({ ...f, discount_value: t }))}
          keyboardType="numeric"
        />
        <Text style={styles.fieldLabel}>Min order (Rs)</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={COLORS.gray400}
          value={form.min_order}
          onChangeText={t => setForm(f => ({ ...f, min_order: t }))}
          keyboardType="numeric"
        />
        <Text style={styles.fieldLabel}>Max discount (Rs, optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 200"
          placeholderTextColor={COLORS.gray400}
          value={form.max_discount}
          onChangeText={t => setForm(f => ({ ...f, max_discount: t }))}
          keyboardType="numeric"
        />
        <Text style={styles.fieldLabel}>Max uses (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 100"
          placeholderTextColor={COLORS.gray400}
          value={form.max_uses}
          onChangeText={t => setForm(f => ({ ...f, max_uses: t }))}
          keyboardType="numeric"
        />
        <Text style={styles.fieldLabel}>Expiry date (YYYY-MM-DD, optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-12-31"
          placeholderTextColor={COLORS.gray400}
          value={form.expires_at}
          onChangeText={t => setForm(f => ({ ...f, expires_at: t }))}
          autoCapitalize="none"
        />
        <Text style={styles.fieldLabel}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputBig]}
          placeholder="What is this coupon for?"
          placeholderTextColor={COLORS.gray400}
          value={form.description}
          onChangeText={t => setForm(f => ({ ...f, description: t }))}
          multiline
        />

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={createCoupon}
          disabled={saving}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? 'Creating...' : 'Create coupon'}
          </Text>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        icon={confirm?.icon}
        tone={confirm?.tone}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          c?.fn?.();
        }}
      />
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
    borderRadius: RADIUS.pill,
    height: 46,
    marginHorizontal: SPACING.md,
    marginBottom: 12,
    ...SHADOW.card,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray600,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 46,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray900,
  },
  inputBig: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray700,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  primaryBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  flatList: {
    flex: 1,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    color: COLORS.primary700,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBtnToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnToggleOff: {
    backgroundColor: COLORS.gray100,
  },
  iconBtnDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.xs,
  },
  meta: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    marginTop: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  onPill: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  onText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.successText,
    textTransform: 'capitalize',
  },
  expiredPill: {
    backgroundColor: COLORS.roseBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  expiredText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.roseText,
  },
  date: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
  },
});

export default AdminCouponsScreen;
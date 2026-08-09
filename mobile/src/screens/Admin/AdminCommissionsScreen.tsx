import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Commission {
  id: number;
  amount: string;
  commission_rate: string;
  commission_amount: string;
  status: string;
  created_at: string;
  booking?: { id: number; service?: { name?: string } | null } | null;
  vendor?: { id: number; business_name?: string } | null;
}

interface CommissionStats {
  total_commission: number;
  pending_commission: number;
  paid_commission: number;
  total_orders: number;
  default_rate: number;
}

const STATUSES = ['all', 'pending', 'paid', 'refunded'];

const AdminCommissionsScreen: React.FC = () => {
  const toast = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rateModal, setRateModal] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { per_page: '100' };
      if (filter !== 'all') params.status = filter;
      const [commRes, statsRes] = await Promise.allSettled([
        api.get('/super-admin/commissions', { params }),
        api.get('/super-admin/commissions/stats'),
      ]);
      if (commRes.status === 'fulfilled') {
        setCommissions(commRes.value.data.data ?? commRes.value.data ?? []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
        setNewRate(String(statsRes.value.data.default_rate ?? ''));
      }
    } catch (e) {
      console.warn('commissions load failed', e);
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

  const markPaid = async (commission: Commission) => {
    setActionLoading(`pay-${commission.id}`);
    try {
      await api.put(`/super-admin/commissions/${commission.id}/pay`);
      load();
      toast.success('Marked as paid.');
    } catch {
      toast.error('Could not mark as paid.');
    } finally {
      setActionLoading(null);
    }
  };

  const saveRate = async () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0) return;
    try {
      await api.post('/super-admin/commissions/rate', { rate });
      setRateModal(false);
      load();
      toast.success('Commission rate updated.');
    } catch {
      toast.error('Could not update commission rate.');
    }
  };

  const renderItem = ({ item }: { item: Commission }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.booking?.service?.name ?? `Commission #${item.id}`}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {item.vendor?.business_name ?? '—'}
      </Text>
      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amount}>Rs {item.commission_amount}</Text>
          <Text style={styles.sub}>
            {item.commission_rate}% of Rs {item.amount}
          </Text>
        </View>
        {item.status === 'pending' ? (
          <Pressable
            style={styles.payBtn}
            onPress={() => markPaid(item)}
            disabled={actionLoading === `pay-${item.id}`}
          >
            {actionLoading === `pay-${item.id}` ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.payText}>Mark paid</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Commissions" subtitle="Platform earnings from bookings" />

      {stats ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Rs {stats.total_commission}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.warningText }]}>
              Rs {stats.pending_commission}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.successText }]}>
              Rs {stats.paid_commission}
            </Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
        </View>
      ) : null}

      <Pressable style={styles.rateBtn} onPress={() => setRateModal(true)}>
        <MaterialIcons name="tune" size={16} color={COLORS.gray600} />
        <Text style={styles.rateText}>
          Commission rate: {stats?.default_rate ?? '—'}%
        </Text>
      </Pressable>

      <FilterChips options={STATUSES} selected={filter} onSelect={setFilter} />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={commissions}
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
            <EmptyState
              title="No commissions"
              message="No commission entries match this filter."
            />
          }
        />
      )}

      <Modal
        visible={rateModal}
        title="Set commission rate"
        subtitle="Percentage taken from each booking."
        icon="tune"
        onClose={() => setRateModal(false)}
      >
        <Text style={styles.label}>Commission rate (%)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 10"
          placeholderTextColor={COLORS.gray400}
          value={newRate}
          onChangeText={setNewRate}
          keyboardType="decimal-pad"
        />
        <View style={styles.modalRow}>
          <Pressable
            style={[styles.modalBtn, styles.cancelBtn]}
            onPress={() => setRateModal(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.modalBtn, styles.saveBtn]}
            onPress={saveRate}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOW.card,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
    fontWeight: '600',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.pill,
    height: 44,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray700,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: 12,
    ...SHADOW.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  meta: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  sub: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 2,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  payText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  date: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.gray400,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray600,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: COLORS.gray900,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.lg,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    color: COLORS.gray700,
    fontWeight: '700',
    fontSize: 14,
  },
  saveText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default AdminCommissionsScreen;
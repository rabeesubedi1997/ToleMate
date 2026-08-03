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
  Modal,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
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
    } catch {
      Alert.alert('Failed', 'Could not mark as paid.');
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
    } catch {
      Alert.alert('Failed', 'Could not update commission rate.');
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
        <MaterialIcons name="tune" size={16} color={COLORS.primary700} />
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
        transparent
        animationType="fade"
        onRequestClose={() => setRateModal(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Set commission rate</Text>
            <Text style={styles.modalHint}>
              Percentage taken from each booking.
            </Text>
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
          </View>
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
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    alignItems: 'center',
    ...SHADOW.card,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 2,
    fontWeight: '600',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary50,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary700,
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
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray500,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary700,
  },
  sub: {
    fontSize: 11,
    color: COLORS.gray400,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 90,
    alignItems: 'center',
  },
  payText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  date: {
    marginTop: SPACING.xs,
    fontSize: 10,
    color: COLORS.gray400,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modal: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  modalHint: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 42,
    fontSize: 14,
    color: COLORS.gray900,
  },
  modalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.gray100,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    color: COLORS.gray700,
    fontWeight: '600',
    fontSize: 13,
  },
  saveText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default AdminCommissionsScreen;

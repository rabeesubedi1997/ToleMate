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
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Booking {
  id: number;
  status: string;
  booking_type?: string | null;
  price?: string | number | null;
  scheduled_time?: string | null;
  reschedule_to?: string | null;
  reschedule_status?: string | null;
  customer?: { id: number; name?: string; phone?: string } | null;
  service?: { id: number; name?: string } | null;
  package?: { id: number; name?: string } | null;
}

const STATUSES = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

const NEXT_ACTIONS: Record<string, { status: string; label: string; icon: string }[]> = {
  pending: [{ status: 'accepted', label: 'Accept', icon: 'check-circle' }],
  accepted: [
    { status: 'in_progress', label: 'Start work', icon: 'play-circle' },
    { status: 'cancelled', label: 'Cancel', icon: 'cancel' },
  ],
  in_progress: [
    { status: 'completed', label: 'Complete', icon: 'done-all' },
    { status: 'cancelled', label: 'Cancel', icon: 'cancel' },
  ],
  completed: [],
  cancelled: [],
};

const VendorBookingsScreen: React.FC = () => {
  const toast = useToast();
  const [items, setItems] = useState<Booking[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [price, setPrice] = useState('');
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    tone?: 'danger' | 'primary' | 'warning';
    confirmLabel?: string;
    icon?: string;
    fn: () => void;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { per_page: '50' };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/bookings', { params });
      setItems(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('vendor bookings load failed', e);
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

  const changeStatus = async (status: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.put(`/bookings/${selected.id}`, {
        status,
        ...(status === 'accepted' && price ? { price: Number(price) } : {}),
      });
      setSelected(null);
      setShowPrice(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not update booking.');
    } finally {
      setBusy(false);
    }
  };

  const confirmChange = (status: string) => {
    if (status === 'cancelled') {
      setConfirm({
        title: 'Cancel booking?',
        message: 'Mark this booking as cancelled?',
        confirmLabel: 'Yes, cancel',
        tone: 'danger',
        icon: 'cancel',
        fn: () => changeStatus(status),
      });
    } else if (status === 'accepted' && selected?.booking_type === 'quote') {
      setShowPrice(true);
    } else {
      changeStatus(status);
    }
  };

  const respondReschedule = (action: 'accept' | 'decline') => {
    if (!selected) return;
    setConfirm({
      title: 'Reschedule request',
      message: `Customer asked to move to ${formatDate(selected.reschedule_to)}. ${
        action === 'accept' ? 'Accept' : 'Decline'
      }?`,
      confirmLabel: action === 'accept' ? 'Accept' : 'Decline',
      tone: action === 'accept' ? 'primary' : 'danger',
      icon: action === 'accept' ? 'event-available' : 'event-busy',
      fn: async () => {
        setBusy(true);
        try {
          await api.post(`/bookings/${selected.id}/reschedule-respond`, { action });
          setSelected(null);
          load();
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Could not respond.');
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => setSelected(item)}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.service?.name ?? `Booking #${item.id}`}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {item.customer?.name ?? 'Customer'}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.time}>
          {item.scheduled_time
            ? `${formatDate(item.scheduled_time)}`
            : 'Date to be confirmed'}
        </Text>
        {item.price !== null && item.price !== undefined ? (
          <Text style={styles.price}>Rs {item.price}</Text>
        ) : null}
      </View>
      {item.reschedule_status === 'pending' ? (
        <View style={styles.reschedPill}>
          <MaterialIcons name="schedule" size={12} color={COLORS.warningText} />
          <Text style={styles.reschedText}>Reschedule request pending</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const actions = selected ? NEXT_ACTIONS[selected.status] ?? [] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ToleMate</Text>
          <Text style={styles.title}>Bookings</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialIcons name="event-note" size={20} color={COLORS.primary} />
        </View>
      </View>

      <FilterChips options={STATUSES} selected={filter} onSelect={setFilter} />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={items}
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
            <EmptyState title="No bookings" message="New bookings will appear here." />
          }
        />
      )}

      <Modal
        visible={!!selected}
        title={selected?.service?.name ?? 'Booking'}
        subtitle={`Booking #${selected?.id ?? ''}`}
        icon="event-note"
        onClose={() => setSelected(null)}
      >
        <ScrollView>
          {selected ? (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>Status</Text>
                  <StatusBadge status={selected.status} />
                </View>
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>Type</Text>
                  <Text style={styles.detailChipValue}>{selected.booking_type ?? '—'}</Text>
                </View>
              </View>

              <Text style={styles.detailLabel}>CUSTOMER</Text>
              <Text style={styles.detailValue}>
                {selected.customer?.name ?? '—'}
                {selected.customer?.phone ? ` · ${selected.customer.phone}` : ''}
              </Text>

              <Text style={styles.detailLabel}>SCHEDULED</Text>
              <Text style={styles.detailValue}>{formatDate(selected.scheduled_time)}</Text>

              {selected.package?.name ? (
                <>
                  <Text style={styles.detailLabel}>PACKAGE</Text>
                  <Text style={styles.detailValue}>{selected.package.name}</Text>
                </>
              ) : null}

              <Text style={styles.detailLabel}>PRICE</Text>
              <Text style={styles.detailPrice}>
                {selected.price !== null && selected.price !== undefined
                  ? `Rs ${selected.price}`
                  : 'Pending quote'}
              </Text>

              {selected.reschedule_status === 'pending' ? (
                <>
                  <Text style={styles.detailLabel}>RESCHEDULE REQUEST</Text>
                  <Text style={styles.detailValue}>{formatDate(selected.reschedule_to)}</Text>
                  <View style={styles.reschedRow}>
                    <TouchableOpacity
                      style={[styles.acceptBtn, busy && styles.btnDisabled]}
                      disabled={busy}
                      onPress={() => respondReschedule('accept')}
                    >
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.declineBtn, busy && styles.btnDisabled]}
                      disabled={busy}
                      onPress={() => respondReschedule('decline')}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}

              {actions.length > 0 ? (
                <View style={styles.actions}>
                  {actions.map(a => (
                    <TouchableOpacity
                      key={a.status}
                      style={[
                        a.status === 'cancelled' ? styles.cancelBtn : styles.actionBtn,
                        busy && styles.btnDisabled,
                      ]}
                      disabled={busy}
                      onPress={() => confirmChange(a.status)}
                    >
                      <MaterialIcons
                        name={a.icon as never}
                        size={16}
                        color={a.status === 'cancelled' ? COLORS.white : COLORS.primary700}
                      />
                      <Text
                        style={
                          a.status === 'cancelled' ? styles.cancelBtnText : styles.actionBtnText
                        }
                      >
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </Modal>

      <Modal
        visible={showPrice}
        title="Set Quote Price"
        subtitle="Confirm the price to accept this request"
        icon="payments"
        onClose={() => setShowPrice(false)}
      >
        <Text style={styles.modalLabel}>PRICE (RS.) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={COLORS.gray400}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={() => changeStatus('accepted')}
          disabled={busy}
        >
          <Text style={styles.primaryBtnText}>Accept with price</Text>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        icon={confirm?.icon}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          c?.fn();
        }}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xl,
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  meta: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 4,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  time: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  reschedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: SPACING.sm,
  },
  reschedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warningText,
  },
  detailRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  detailChip: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
  },
  detailChipLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gray400,
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailChipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray800,
    textTransform: 'capitalize',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gray400,
    letterSpacing: 1,
    marginTop: SPACING.md,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.gray800,
    fontWeight: '600',
  },
  detailPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary700,
  },
  reschedRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  acceptBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 44,
  },
  acceptBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  declineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.pill,
    height: 44,
  },
  declineBtnText: {
    color: COLORS.gray700,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary100,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  actionBtnText: {
    color: COLORS.primary700,
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.rose,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  cancelBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gray600,
    marginTop: SPACING.md,
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.md,
    height: 46,
    fontSize: 14,
    color: COLORS.gray900,
  },
  primaryBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default VendorBookingsScreen;

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';

interface Booking {
  id: number;
  status: string;
  price: string;
  booking_type: string;
  payment_status: string;
  scheduled_time?: string;
  created_at: string;
  service?: { id: number; name?: string } | null;
  customer?: { id: number; name?: string; email?: string } | null;
  vendor?: { id: number; business_name?: string } | null;
}

const STATUSES = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

const STATUS_OPTIONS = ['accepted', 'in_progress', 'completed', 'cancelled'];

const AdminBookingsScreen: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Booking | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { per_page: '100' };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/admin/bookings', { params });
      setBookings(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('admin bookings load failed', e);
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

  const changeStatus = (booking: Booking) => {
    setStatusTarget(booking);
  };

  const applyStatus = async (booking: Booking, status: string) => {
    try {
      await api.put(`/admin/bookings/${booking.id}/status`, { status });
      setStatusTarget(null);
      load();
    } catch {
      toast.error('Could not update booking status.');
    }
  };

  const renderItem = ({ item }: { item: Booking }) => (
    <Pressable style={styles.card} onPress={() => changeStatus(item)}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.service?.name ?? `Booking #${item.id}`}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        Customer: {item.customer?.name ?? '—'}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        Vendor: {item.vendor?.business_name ?? '—'}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={styles.price}>Rs {item.price}</Text>
        <View style={styles.payRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  item.payment_status === 'paid' || item.payment_status === 'released'
                    ? COLORS.successText
                    : COLORS.warningText,
              },
            ]}
          />
          <Text style={styles.payText}>{item.payment_status}</Text>
        </View>
      </View>
      <Text style={styles.time}>
        {item.scheduled_time
          ? new Date(item.scheduled_time).toLocaleString()
          : new Date(item.created_at).toLocaleDateString()}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bookings" subtitle="Tap a booking to update status" />
      <FilterChips options={STATUSES} selected={filter} onSelect={setFilter} />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          style={styles.flatList}
          data={bookings}
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
              title="No bookings"
              message="No bookings match this filter."
            />
          }
        />
      )}

      <Modal
        visible={statusTarget !== null}
        title={`Booking #${statusTarget?.id ?? ''}`}
        subtitle="Set new status"
        icon="schedule"
        onClose={() => setStatusTarget(null)}
      >
        <StatusBadge status={statusTarget?.status ?? ''} />
        <Text style={styles.optionsLabel}>New status</Text>
        <View style={styles.chipsRow}>
          {STATUS_OPTIONS.map(status => {
            const active = statusTarget?.status === status;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  if (statusTarget && !active) applyStatus(statusTarget, status);
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {status.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setStatusTarget(null)}
        >
          <Text style={styles.secondaryBtnText}>Cancel</Text>
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
    marginBottom: SPACING.xs,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  meta: {
    fontSize: FONT_SIZE.sm,
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
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  payText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  time: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
  },
  optionsLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  secondaryBtn: {
    marginTop: SPACING.lg,
    height: 46,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.gray700,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
});

export default AdminBookingsScreen;
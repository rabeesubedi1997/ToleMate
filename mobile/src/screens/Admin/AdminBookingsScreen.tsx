import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

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

const AdminBookingsScreen: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    const options = ['accepted', 'in_progress', 'completed', 'cancelled'];
    Alert.alert(
      `Booking #${booking.id}`,
      'Set new status',
      [
        ...options.map(status => ({
          text: status.replace(/_/g, ' '),
          onPress: async () => {
            try {
              await api.put(`/admin/bookings/${booking.id}/status`, { status });
              load();
            } catch {
              Alert.alert('Failed', 'Could not update booking status.');
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
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
    fontSize: 11,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  time: {
    marginTop: SPACING.xs,
    fontSize: 11,
    color: COLORS.gray400,
  },
});

export default AdminBookingsScreen;

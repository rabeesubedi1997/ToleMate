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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
import { MainStackParamList } from '../../navigation/types';

interface Booking {
  id: number;
  status: string;
  payment_status?: string | null;
  booking_type?: string | null;
  price?: string | number | null;
  scheduled_time?: string | null;
  reschedule_to?: string | null;
  reschedule_status?: string | null;
  created_at?: string;
  service?: {
    id: number;
    name?: string;
    sale_price?: string | number | null;
    price?: string | number | null;
  } | null;
  vendor?: {
    id: number;
    business_name?: string;
    user?: { name?: string } | null;
  } | null;
  review?: { id: number; rating: number; comment?: string | null } | null;
  package?: { id: number; name?: string } | null;
}

const STATUSES = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warningBg,
  accepted: COLORS.infoBg,
  in_progress: COLORS.infoBg,
  completed: COLORS.successBg,
  cancelled: COLORS.roseBg,
};

const STATUS_TINTS: Record<string, string> = {
  pending: COLORS.warningText,
  accepted: COLORS.infoText,
  in_progress: COLORS.infoText,
  completed: COLORS.successText,
  cancelled: COLORS.roseText,
};

const MyBookingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [items, setItems] = useState<Booking[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { per_page: '50' };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/bookings', { params });
      setItems(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('bookings load failed', e);
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

  const cancelBooking = () => {
    if (!selected) return;
    Alert.alert('Cancel booking', 'Cancel this booking? This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.put(`/bookings/${selected.id}`, { status: 'cancelled' });
            setSelected(null);
            load();
          } catch (e: any) {
            Alert.alert('Failed', e?.response?.data?.message ?? 'Could not cancel booking.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const sendReschedule = async () => {
    if (!selected) return;
    if (!reschedDate || !reschedTime) {
      Alert.alert('Missing', 'Pick a new date and time.');
      return;
    }
    const scheduled = new Date(`${reschedDate}T${reschedTime}:00`);
    if (scheduled.getTime() <= Date.now()) {
      Alert.alert('Invalid', 'Reschedule time must be in the future.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/bookings/${selected.id}/reschedule`, {
        reschedule_to: scheduled.toISOString(),
      });
      Alert.alert('Request sent', 'The vendor will confirm the new time.');
      setShowReschedule(false);
      setSelected(null);
      load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not request reschedule.');
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post('/reviews', {
        booking_id: selected.id,
        rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert('Thanks!', 'Your review was submitted.');
      setShowReview(false);
      setSelected(null);
      load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not submit review.');
    } finally {
      setBusy(false);
    }
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
        <View
          style={[
            styles.statusPill,
            { backgroundColor: STATUS_COLORS[item.status] ?? COLORS.gray100 },
          ]}
        >
          <Text style={[styles.statusText, { color: STATUS_TINTS[item.status] ?? COLORS.gray600 }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {item.vendor?.business_name ?? item.vendor?.user?.name ?? 'Vendor'}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.time}>
          {item.scheduled_time ? `📅 ${formatDate(item.scheduled_time)}` : 'Date to be confirmed'}
        </Text>
        {item.price !== null && item.price !== undefined ? (
          <Text style={styles.price}>Rs {item.price}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const selectedStatus = selected?.status;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ToleMate</Text>
          <Text style={styles.title}>My Bookings</Text>
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
            <EmptyState title="No bookings" message="Book a service to see it here." />
          }
        />
      )}

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        title={selected?.service?.name ?? 'Booking'}
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
                {selected.payment_status ? (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>Payment</Text>
                    <StatusBadge status={selected.payment_status} />
                  </View>
                ) : null}
              </View>

              <Text style={styles.detailLabel}>VENDOR</Text>
              <Text style={styles.detailValue}>
                {selected.vendor?.business_name ?? selected.vendor?.user?.name ?? '—'}
              </Text>

              <Text style={styles.detailLabel}>SCHEDULED</Text>
              <Text style={styles.detailValue}>{formatDate(selected.scheduled_time)}</Text>

              {selected.package?.name ? (
                <>
                  <Text style={styles.detailLabel}>PACKAGE</Text>
                  <Text style={styles.detailValue}>{selected.package.name}</Text>
                </>
              ) : null}

              {selected.reschedule_status ? (
                <>
                  <Text style={styles.detailLabel}>RESCHEDULE REQUEST</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selected.reschedule_to)} — {selected.reschedule_status}
                  </Text>
                </>
              ) : null}

              <Text style={styles.detailLabel}>PRICE</Text>
              <Text style={styles.detailPrice}>
                {selected.price !== null && selected.price !== undefined
                  ? `Rs ${selected.price}`
                  : 'Price on request'}
              </Text>

              {selectedStatus === 'accepted' &&
              selected.payment_status === 'pending' ? (
                <TouchableOpacity
                  style={[styles.payBtn, busy && styles.btnDisabled]}
                  disabled={busy}
                  onPress={() => {
                    setSelected(null);
                    navigation.navigate('Checkout', {
                      bookingId: selected.id,
                    });
                  }}
                >
                  <MaterialIcons name="lock" size={16} color={COLORS.white} />
                  <Text style={styles.payBtnText}>Pay now</Text>
                </TouchableOpacity>
              ) : null}

              {selected.review ? (
                <>
                  <Text style={styles.detailLabel}>YOUR REVIEW</Text>
                  <Text style={styles.detailValue}>
                    {'★'.repeat(selected.review.rating)}{' '}
                    {selected.review.comment ? `— ${selected.review.comment}` : ''}
                  </Text>
                </>
              ) : null}

              {['pending', 'accepted'].includes(selectedStatus ?? '') ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, busy && styles.btnDisabled]}
                    disabled={busy}
                    onPress={() => {
                      setShowReschedule(true);
                    }}
                  >
                    <MaterialIcons name="schedule" size={16} color={COLORS.primary700} />
                    <Text style={styles.actionBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelBtn, busy && styles.btnDisabled]}
                    disabled={busy}
                    onPress={cancelBooking}
                  >
                    <MaterialIcons name="cancel" size={16} color={COLORS.white} />
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {selectedStatus === 'completed' && !selected.review ? (
                <TouchableOpacity
                  style={[styles.reviewBtn, busy && styles.btnDisabled]}
                  disabled={busy}
                  onPress={() => {
                    setRating(5);
                    setComment('');
                    setShowReview(true);
                  }}
                >
                  <MaterialIcons name="star" size={16} color={COLORS.accent} />
                  <Text style={styles.reviewBtnText}>Write a review</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </Modal>

      {/* Reschedule modal */}
      <Modal visible={showReschedule} title="Reschedule Booking" onClose={() => setShowReschedule(false)}>
        <Text style={styles.modalLabel}>NEW DATE (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-08-10"
          placeholderTextColor={COLORS.gray400}
          value={reschedDate}
          onChangeText={setReschedDate}
          autoCapitalize="none"
        />
        <Text style={styles.modalLabel}>NEW TIME (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="10:00"
          placeholderTextColor={COLORS.gray400}
          value={reschedTime}
          onChangeText={setReschedTime}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={sendReschedule}
          disabled={busy}
        >
          <Text style={styles.primaryBtnText}>Send request</Text>
        </TouchableOpacity>
      </Modal>

      {/* Review modal */}
      <Modal visible={showReview} title="Write a Review" onClose={() => setShowReview(false)}>
        <Text style={styles.modalLabel}>RATING</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(s => (
            <TouchableOpacity key={s} onPress={() => setRating(s)}>
              <MaterialIcons
                name={s <= rating ? 'star' : 'star-border'}
                size={34}
                color={COLORS.accent}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.modalLabel}>COMMENT (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="How was the service?"
          placeholderTextColor={COLORS.gray400}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={submitReview}
          disabled={busy}
        >
          <Text style={styles.primaryBtnText}>Submit review</Text>
        </TouchableOpacity>
      </Modal>
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
  statusPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
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
    borderRadius: RADIUS.md,
    height: 44,
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
    borderRadius: RADIUS.md,
    height: 44,
  },
  cancelBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
  },
  payBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 44,
  },
  reviewBtnText: {
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
    height: 44,
    fontSize: 14,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  primaryBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
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

export default MyBookingsScreen;

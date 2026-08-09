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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';
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

interface ConfirmState {
  title: string;
  message: string;
  tone?: 'danger' | 'primary' | 'warning';
  confirmLabel?: string;
  icon?: string;
  fn: () => void;
}

const STATUSES = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

const STATUS_TINTS: Record<string, string> = {
  pending: COLORS.warningText,
  accepted: COLORS.infoText,
  in_progress: COLORS.infoText,
  completed: COLORS.successText,
  cancelled: COLORS.roseText,
};

const MyBookingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const toast = useToast();
  const [items, setItems] = useState<Booking[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
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

  const askCancel = () => {
    if (!selected) return;
    setConfirm({
      title: 'Cancel booking',
      message: 'Cancel this booking? This cannot be undone.',
      tone: 'danger',
      confirmLabel: 'Cancel booking',
      icon: 'cancel',
      fn: async () => {
        setBusy(true);
        try {
          await api.put(`/bookings/${selected.id}`, { status: 'cancelled' });
          setSelected(null);
          load();
          toast.success('Booking cancelled');
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Could not cancel booking.');
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const sendReschedule = async () => {
    if (!selected) return;
    if (!reschedDate || !reschedTime) {
      toast.info('Pick a new date and time.');
      return;
    }
    const scheduled = new Date(`${reschedDate}T${reschedTime}:00`);
    if (scheduled.getTime() <= Date.now()) {
      toast.info('Reschedule time must be in the future.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/bookings/${selected.id}/reschedule`, {
        reschedule_to: scheduled.toISOString(),
      });
      toast.success('The vendor will confirm the new time.');
      setShowReschedule(false);
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not request reschedule.');
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
      toast.success('Your review was submitted.');
      setShowReview(false);
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not submit review.');
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

  const renderItem = ({ item }: { item: Booking }) => {
    const tint = STATUS_TINTS[item.status] ?? COLORS.gray500;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setSelected(item)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.service?.name ?? `Booking #${item.id}`}
            </Text>
            <Text style={styles.cardVendor} numberOfLines={1}>
              {item.vendor?.business_name ?? item.vendor?.user?.name ?? 'Vendor'}
            </Text>
          </View>
          <View style={styles.badgeCol}>
            <StatusBadge status={item.status} />
            <View style={styles.dotRow}>
              <View style={[styles.statusDot, { backgroundColor: tint }]} />
              <Text style={[styles.dotText, { color: tint }]}>{item.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <MaterialIcons name="event" size={15} color={COLORS.gray400} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.scheduled_time
              ? formatDate(item.scheduled_time)
              : 'Date to be confirmed'}
          </Text>
        </View>

        <View style={styles.cardBottom}>
          {item.price !== null && item.price !== undefined ? (
            <Text style={styles.price}>Rs {item.price}</Text>
          ) : (
            <Text style={styles.price}>Price on request</Text>
          )}
          <MaterialIcons name="chevron-right" size={20} color={COLORS.gray300} />
        </View>
      </TouchableOpacity>
    );
  };

  const selectedStatus = selected?.status;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed header */}
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
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
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
        subtitle={
          selected?.vendor?.business_name ?? selected?.vendor?.user?.name
        }
        icon="event-note"
        onClose={() => setSelected(null)}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {selected ? (
            <>
              <View style={styles.detailStatusRow}>
                <View style={styles.detailStatusCol}>
                  <Text style={styles.detailLabel}>STATUS</Text>
                  <StatusBadge status={selected.status} />
                </View>
                {selected.payment_status ? (
                  <View style={styles.detailStatusCol}>
                    <Text style={styles.detailLabel}>PAYMENT</Text>
                    <StatusBadge status={selected.payment_status} />
                  </View>
                ) : null}
              </View>

              <View style={styles.detailBox}>
                <View style={styles.detailMetaRow}>
                  <MaterialIcons name="event" size={16} color={COLORS.gray400} />
                  <Text style={styles.detailMetaText}>
                    Scheduled · {formatDate(selected.scheduled_time)}
                  </Text>
                </View>
                {selected.package?.name ? (
                  <View style={styles.detailMetaRow}>
                    <MaterialIcons name="layers" size={16} color={COLORS.gray400} />
                    <Text style={styles.detailMetaText}>
                      Package · {selected.package.name}
                    </Text>
                  </View>
                ) : null}
                {selected.reschedule_status ? (
                  <View style={styles.detailMetaRow}>
                    <MaterialIcons name="schedule" size={16} color={COLORS.gray400} />
                    <Text style={styles.detailMetaText}>
                      Reschedule · {formatDate(selected.reschedule_to)} ·{' '}
                      {selected.reschedule_status}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total</Text>
                <Text style={styles.detailPrice}>
                  {selected.price !== null && selected.price !== undefined
                    ? `Rs ${selected.price}`
                    : 'Price on request'}
                </Text>
              </View>

              {selected.review ? (
                <View style={styles.detailBox}>
                  <View style={styles.detailMetaRow}>
                    <MaterialIcons name="star" size={16} color={COLORS.accent} />
                    <Text style={styles.detailMetaText}>
                      {'★'.repeat(selected.review.rating)}
                    </Text>
                  </View>
                  {selected.review.comment ? (
                    <Text style={styles.reviewComment}>
                      {selected.review.comment}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {selectedStatus === 'accepted' &&
              selected.payment_status === 'pending' ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                  disabled={busy}
                  onPress={() => {
                    setSelected(null);
                    navigation.navigate('Checkout', {
                      bookingId: selected.id,
                    });
                  }}
                >
                  <MaterialIcons name="lock" size={16} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Pay now</Text>
                </TouchableOpacity>
              ) : null}

              {selectedStatus === 'completed' && selected.service ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                  disabled={busy}
                  onPress={() => {
                    setSelected(null);
                    navigation.navigate('BookingForm', {
                      id: selected.service!.id,
                    });
                  }}
                >
                  <MaterialIcons name="replay" size={16} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Book again</Text>
                </TouchableOpacity>
              ) : null}

              {['pending', 'accepted'].includes(selectedStatus ?? '') ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.outlineBtn, busy && styles.btnDisabled]}
                    disabled={busy}
                    onPress={() => {
                      setShowReschedule(true);
                    }}
                  >
                    <MaterialIcons name="schedule" size={16} color={COLORS.primary700} />
                    <Text style={styles.outlineBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelBtn, busy && styles.btnDisabled]}
                    disabled={busy}
                    onPress={askCancel}
                  >
                    <MaterialIcons name="cancel" size={16} color={COLORS.rose} />
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

      {/* Cancel confirmation */}
      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        tone={confirm?.tone}
        icon={confirm?.icon}
        confirmLabel={confirm?.confirmLabel}
        loading={busy}
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
    backgroundColor: COLORS.light,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
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
    borderWidth: 1,
    borderColor: COLORS.gray100,
    ...SHADOW.card,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.xs,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  cardVendor: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    marginTop: 3,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.gray100,
    marginVertical: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  metaText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray600,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  detailStatusRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  detailStatusCol: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm + 4,
    gap: 6,
  },
  detailLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    color: COLORS.gray400,
    letterSpacing: 1,
  },
  detailBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailMetaText: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray800,
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray600,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingHorizontal: 2,
  },
  priceLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailPrice: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.primary700,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary50,
    borderWidth: 1,
    borderColor: COLORS.primary200,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  outlineBtnText: {
    color: COLORS.primary700,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.roseBg,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  cancelBtnText: {
    color: COLORS.rose,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  reviewBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: FONT_SIZE.xs,
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
    fontSize: FONT_SIZE.base,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default MyBookingsScreen;
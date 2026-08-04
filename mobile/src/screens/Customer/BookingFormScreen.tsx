import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
import AppImage from '../../components/AppImage';
import ScreenHeader from '../../components/ScreenHeader';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'BookingForm'>;

interface ServiceInfo {
  id: number;
  name: string;
  price?: string | number | null;
  sale_price?: string | number | null;
  pricing_type?: string | null;
  images?: { id: number; file_path: string }[];
  vendor?: {
    id: number;
    business_name?: string;
    user?: { name?: string; phone?: string } | null;
  } | null;
}

interface Slot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const BOOKING_TYPES = [
  { key: 'instant', label: 'Instant', icon: 'bolt' },
  { key: 'quote', label: 'Quote', icon: 'request-quote' },
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function buildTimeSlots(start: string, end: string): string[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const slots: string[] = [];
  let h = sh;
  let m = sm;
  while (h < eh || (h === eh && m < em)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 60;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
  }
  return slots;
}

const BookingFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [service, setService] = useState<ServiceInfo | null>(null);
  const [availability, setAvailability] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<'instant' | 'quote'>('instant');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get(`/services/${id}`),
      api.get(`/vendors/${id}/availability`).catch(() => null),
    ])
      .then(([svcRes, availRes]) => {
        if (!mounted) return;
        setService(svcRes.data.service);
        const avail = (availRes?.data?.availability as Slot[]) ?? [];
        setAvailability(avail);
        const next = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));
        setDates(next);
        const firstAvail = next.find(d => avail[d.getDay()]?.is_available !== false);
        if (firstAvail) {
          setSelectedDate(toDateStr(firstAvail));
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Could not load booking details.');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  const pickDate = useCallback(
    (ds: string) => {
      setSelectedDate(ds);
      setSelectedSlot(null);
      const date = new Date(`${ds}T00:00:00`);
      const day = date.getDay();
      const slot = availability.find(s => s.day_of_week === day);
      if (slot?.is_available && slot.start_time && slot.end_time) {
        setSlots(buildTimeSlots(slot.start_time, slot.end_time));
      } else {
        setSlots([]);
      }
    },
    [availability],
  );

  const submit = async () => {
    if (!service) return;
    if (!selectedDate || !selectedSlot) {
      Alert.alert('Missing', 'Please choose a date and time slot.');
      return;
    }
    const scheduled = new Date(`${selectedDate}T${selectedSlot}:00`);
    if (scheduled.getTime() <= Date.now()) {
      Alert.alert('Invalid time', 'Please pick a future date and time.');
      return;
    }
    if (bookingType === 'quote' && (!price || Number(price) <= 0)) {
      Alert.alert('Missing', 'Please enter your suggested price for a quote.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bookings', {
        service_id: service.id,
        booking_type: bookingType,
        price:
          bookingType === 'quote'
            ? Number(price)
            : service.sale_price != null
              ? Number(service.sale_price)
              : Number(service.price ?? 0),
        scheduled_time: scheduled.toISOString(),
        message: message.trim() || undefined,
      });
      Alert.alert(
        'Booking created',
        bookingType === 'quote'
          ? 'Your quote request was sent to the vendor. They will confirm the price.'
          : 'Your booking was created. The vendor will confirm shortly.',
        [{ text: 'OK', onPress: () => navigation.replace('MyBookings') }],
      );
    } catch (e: any) {
      Alert.alert(
        'Failed',
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not create booking.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Service not found</Text>
      </View>
    );
  }

  const image = service.images?.[0]?.file_path ?? null;
  const priceLabel = service.sale_price ?? service.price;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Book Service" subtitle={service.name} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Summary card */}
        <View style={styles.summary}>
          <AppImage uri={image} style={styles.thumb} />
          <View style={styles.summaryBody}>
            <Text style={styles.summaryName} numberOfLines={2}>
              {service.name}
            </Text>
            <Text style={styles.summaryVendor}>
              {service.vendor?.business_name ?? 'Vendor'}
            </Text>
            {priceLabel !== null && priceLabel !== undefined ? (
              <Text style={styles.summaryPrice}>Rs {priceLabel}</Text>
            ) : null}
          </View>
        </View>

        {/* Booking type */}
        <Text style={styles.label}>BOOKING TYPE</Text>
        <View style={styles.typeRow}>
          {BOOKING_TYPES.map(t => {
            const active = bookingType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeBtn, active && styles.typeBtnActive]}
                onPress={() => setBookingType(t.key as 'instant' | 'quote')}
              >
                <MaterialIcons
                  name={t.icon as never}
                  size={18}
                  color={active ? COLORS.primary : COLORS.gray500}
                />
                <Text style={[styles.typeText, active && styles.typeTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>
          {bookingType === 'instant'
            ? 'Book at the listed price — the vendor will confirm.'
            : 'Request a custom price — the vendor will confirm your quote.'}
        </Text>

        {bookingType === 'quote' ? (
          <View style={styles.inputBlock}>
            <Text style={styles.label}>YOUR PRICE (RS.)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1500"
              placeholderTextColor={COLORS.gray400}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
        ) : null}

        {/* Date picker */}
        <Text style={styles.label}>SELECT DATE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesRow}
        >
          {dates.map(d => {
            const ds = toDateStr(d);
            const active = selectedDate === ds;
            const day = d.getDay();
            const slot = availability.find(s => s.day_of_week === day);
            const disabled = slot?.is_available === false;
            return (
              <TouchableOpacity
                key={ds}
                disabled={disabled}
                style={[styles.dateChip, active && styles.dateChipActive, disabled && styles.dateChipOff]}
                onPress={() => pickDate(ds)}
              >
                <Text style={[styles.dateDay, active && styles.dateDayActive]}>
                  {DAY_SHORT[day]}
                </Text>
                <Text style={[styles.dateNum, active && styles.dateNumActive]}>
                  {d.getDate()}
                </Text>
                <Text style={[styles.dateMonth, active && styles.dateMonthActive]}>
                  {d.toLocaleString('en', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time slots */}
        <Text style={styles.label}>SELECT TIME</Text>
        {slots.length === 0 ? (
          <Text style={styles.hint}>No slots available for the selected date.</Text>
        ) : (
          <View style={styles.slotsWrap}>
            {slots.map(t => {
              const active = selectedSlot === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.slotChip, active && styles.slotChipActive]}
                  onPress={() => setSelectedSlot(t)}
                >
                  <Text style={[styles.slotText, active && styles.slotTextActive]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Notes */}
        <Text style={styles.label}>NOTES FOR VENDOR (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Describe your job, address, preferences..."
          placeholderTextColor={COLORS.gray400}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
        />
      </ScrollView>

      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={[styles.bookBtn, submitting && styles.btnDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.bookBtnText}>
              {bookingType === 'quote' ? 'Send Quote Request' : 'Confirm Booking'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.slate500,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    ...SHADOW.card,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
  },
  summaryBody: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  summaryName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  summaryVendor: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary700,
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gray600,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  typeBtnActive: {
    backgroundColor: COLORS.primary50,
    borderColor: COLORS.primary,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  typeTextActive: {
    color: COLORS.primary700,
  },
  hint: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 6,
    lineHeight: 17,
  },
  inputBlock: {
    marginTop: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    height: 46,
    fontSize: 15,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  datesRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  dateChip: {
    width: 62,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  dateChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateChipOff: {
    opacity: 0.35,
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray500,
  },
  dateDayActive: {
    color: COLORS.primary100,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.gray900,
    marginTop: 2,
  },
  dateNumActive: {
    color: COLORS.white,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray400,
    marginTop: 1,
  },
  dateMonthActive: {
    color: COLORS.primary100,
  },
  slotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  slotChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  slotTextActive: {
    color: COLORS.white,
  },
  ctaBar: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default BookingFormScreen;

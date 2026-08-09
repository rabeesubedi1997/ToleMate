import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, SHADOW, FONT_SIZE } from '../../theme';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Checkout'>;

interface BookingInfo {
  id: number;
  price?: string | number | null;
  payment_status?: string | null;
  status?: string | null;
  scheduled_time?: string | null;
  service?: {
    name?: string;
    vendor?: { business_name?: string };
  } | null;
  package?: { name?: string } | null;
}

const PLATFORM_FEE = 100;
const WEB_URL = __DEV__
  ? 'http://10.0.2.2:3000'
  : 'https://tolemate.kitetool.com';

const CheckoutScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const toast = useToast();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<'card' | 'khalti'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .get(`/bookings/${bookingId}`)
      .then(res => {
        if (mounted) setBooking(res.data.booking ?? res.data);
      })
      .catch(() => toast.error('Could not load booking.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [bookingId, toast]);

  const amount = Number(booking?.price ?? 0);
  const total = amount + PLATFORM_FEE;

  const payCard = async () => {
    const last4 = cardNumber.replace(/\s/g, '').slice(-4);
    if (last4.length !== 4) {
      toast.error('Enter a card number to pay with.');
      return;
    }
    setPaying(true);
    try {
      await api.post('/payments/mock', {
        booking_id: bookingId,
        payment_method: 'Stripe Mock',
        card_last_four: last4,
      });
      toast.success('Payment successful.');
      navigation.goBack();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ?? 'Could not process payment.',
      );
    } finally {
      setPaying(false);
    }
  };

  const payKhalti = async () => {
    const url = `${WEB_URL}/checkout/${bookingId}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      toast.error('No browser app found on this device.');
      return;
    }
    await Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Checkout" subtitle="Secure payment" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking #{booking?.id}</Text>
          <Text style={styles.itemName}>{booking?.service?.name ?? 'Service'}</Text>
          <Text style={styles.itemMeta}>
            {booking?.service?.vendor?.business_name ?? 'Vendor'}
          </Text>
          {booking?.package?.name ? (
            <Text style={styles.itemMeta}>Package: {booking.package.name}</Text>
          ) : null}
          {booking?.scheduled_time ? (
            <Text style={styles.itemMeta}>
              {new Date(booking.scheduled_time).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Service</Text>
            <Text style={styles.sumValue}>Rs {amount}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Platform fee</Text>
            <Text style={styles.sumValue}>Rs {PLATFORM_FEE}</Text>
          </View>
          <View style={[styles.sumRow, styles.sumTotalRow]}>
            <Text style={styles.sumTotalLabel}>Total</Text>
            <Text style={styles.sumTotalValue}>Rs {total}</Text>
          </View>
        </View>

        <Text style={styles.label}>Payment method</Text>
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'card' && styles.methodBtnActive]}
            onPress={() => setMethod('card')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="credit-card"
              size={18}
              color={method === 'card' ? COLORS.primary : COLORS.gray500}
            />
            <Text style={[styles.methodText, method === 'card' && styles.methodTextActive]}>
              Card
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'khalti' && styles.methodBtnActive]}
            onPress={() => setMethod('khalti')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="account-balance-wallet"
              size={18}
              color={method === 'khalti' ? COLORS.primary : COLORS.gray500}
            />
            <Text style={[styles.methodText, method === 'khalti' && styles.methodTextActive]}>
              Khalti
            </Text>
          </TouchableOpacity>
        </View>

        {method === 'card' ? (
          <View style={styles.card}>
            <Text style={styles.label}>Card number</Text>
            <TextInput
              style={styles.input}
              placeholder="4242 4242 4242 4242"
              placeholderTextColor={COLORS.gray400}
              value={cardNumber}
              onChangeText={t => setCardNumber(t.replace(/[^0-9 ]/g, ''))}
              keyboardType="number-pad"
              maxLength={19}
            />
            <Text style={styles.hint}>
              Mock payment for testing — no real charge is made.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.hint}>
              You will be redirected to ToleMate's web checkout to complete the
              Khalti payment, then return to the app.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, paying && styles.btnDisabled]}
          onPress={method === 'card' ? payCard : payKhalti}
          disabled={paying}
          activeOpacity={0.85}
        >
          {paying ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.payBtnText}>
              Pay Rs {total} via {method === 'card' ? 'Card' : 'Khalti'}
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
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemName: {
    marginTop: 4,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sumLabel: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  sumValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  sumTotalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray100,
    marginTop: 4,
    paddingTop: SPACING.sm,
  },
  sumTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  sumTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  methodRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  methodBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary50,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  methodTextActive: {
    color: COLORS.primary700,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.md,
    height: 50,
    fontSize: 15,
    color: COLORS.gray900,
    letterSpacing: 1,
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  footer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray100,
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default CheckoutScreen;
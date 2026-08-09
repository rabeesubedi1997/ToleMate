import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';
import { MainStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

interface BookingConv {
  id: number;
  status: string;
  service?: { name?: string } | null;
  customer?: { id: number; name?: string } | null;
  vendor?: { id: number; user?: { name?: string } | null; business_name?: string } | null;
  messages?: { message?: string; created_at?: string }[];
}

interface DirectConv {
  other_user: { id: number; name: string; role: string };
  last_message: string;
  last_at: string;
  unread_count: number;
}

type Conv = BookingConv | DirectConv;

type Tab = 'all' | 'bookings' | 'direct';

const CHAT_FILTERS = ['all', 'bookings', 'direct'];

const isDirect = (c: Conv): c is DirectConv => 'other_user' in c;

const AdminMessagesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('all');
  const [bookings, setBookings] = useState<BookingConv[]>([]);
  const [direct, setDirect] = useState<DirectConv[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bRes, dRes] = await Promise.all([
        api.get('/conversations'),
        api.get('/direct-conversations'),
      ]);
      setBookings(bRes.data ?? []);
      setDirect(dRes.data ?? []);
    } catch (e) {
      console.warn('admin messages load failed', e);
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

  const openBookingChat = (conv: BookingConv) => {
    const customer = conv.customer?.name ?? 'Customer';
    const vendor = conv.vendor?.user?.name ?? conv.vendor?.business_name ?? 'Vendor';
    navigation.navigate('AdminChat', {
      title: `${conv.service?.name ?? 'Booking'} #${conv.id}`,
      subtitle: `${customer} · ${vendor}`,
      bookingId: conv.id,
    });
  };

  const openDirectChat = (conv: DirectConv) => {
    navigation.navigate('AdminChat', {
      title: conv.other_user.name,
      subtitle: conv.other_user.role,
      withId: conv.other_user.id,
    });
  };

  const renderBooking = (item: BookingConv) => {
    const last = item.messages?.[0];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => openBookingChat(item)}
      >
        <View style={[styles.icon, styles.iconBooking]}>
          <MaterialIcons name="event" size={18} color={COLORS.primary700} />
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.sender} numberOfLines={1}>
              {item.service?.name ?? 'Booking'} #{item.id}
            </Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {item.customer?.name ?? 'Customer'} · {item.vendor?.user?.name ?? item.vendor?.business_name ?? 'Vendor'}
          </Text>
          <Text style={styles.message} numberOfLines={1}>
            {last?.message ?? 'No messages yet'}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={COLORS.gray300} />
      </TouchableOpacity>
    );
  };

  const renderDirect = (item: DirectConv) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => openDirectChat(item)}
    >
      <View style={[styles.icon, styles.iconDirect]}>
        <MaterialIcons name="chat" size={18} color={COLORS.infoText} />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.sender} numberOfLines={1}>
            {item.other_user.name}
          </Text>
          <Text style={styles.role}>{item.other_user.role}</Text>
        </View>
        <Text style={styles.message} numberOfLines={1}>
          {item.last_message}
        </Text>
        <Text style={styles.time}>
          {new Date(item.last_at).toLocaleString()}
        </Text>
      </View>
      {item.unread_count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unread_count}</Text>
        </View>
      ) : null}
      <MaterialIcons name="chevron-right" size={20} color={COLORS.gray300} />
    </TouchableOpacity>
  );

  const data: Conv[] =
    tab === 'bookings'
      ? bookings
      : tab === 'direct'
        ? direct
        : ([...bookings, ...direct] as Conv[]);

  const renderItem = ({ item }: { item: Conv }) =>
    isDirect(item) ? renderDirect(item) : renderBooking(item);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Messages" subtitle="Chat with customers and vendors" />
      <FilterChips
        options={CHAT_FILTERS}
        selected={tab}
        onSelect={t => setTab(t as Tab)}
      />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item =>
            isDirect(item) ? `d${item.other_user.id}` : `b${item.id}`
          }
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
              title="No conversations"
              message="Chats with customers and vendors will appear here."
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
    marginTop: 60,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    paddingBottom: SPACING.xl + 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  iconBooking: {
    backgroundColor: COLORS.primary100,
  },
  iconDirect: {
    backgroundColor: COLORS.infoBg,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sender: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.gray800,
  },
  meta: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray500,
    marginTop: 2,
  },
  message: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray600,
    marginTop: 4,
  },
  time: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 2,
  },
  role: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.infoText,
    textTransform: 'capitalize',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: SPACING.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
});

export default AdminMessagesScreen;
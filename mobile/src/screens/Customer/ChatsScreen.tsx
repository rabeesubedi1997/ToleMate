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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
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

const ChatsScreen: React.FC = () => {
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
      console.warn('chats load failed', e);
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
    navigation.navigate('Chat', {
      title: `${conv.service?.name ?? 'Booking'} #${conv.id}`,
      subtitle: `${customer} · ${vendor}`,
      bookingId: conv.id,
    });
  };

  const openDirectChat = (conv: DirectConv) => {
    navigation.navigate('Chat', {
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
        <View style={styles.icon}>
          <MaterialIcons name="event" size={16} color={COLORS.primary} />
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.sender} numberOfLines={1}>
              {item.service?.name ?? 'Booking'} #{item.id}
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
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
      <View style={styles.icon}>
        <MaterialIcons name="chat" size={16} color={COLORS.infoText} />
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ToleMate</Text>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialIcons name="chat-bubble" size={20} color={COLORS.primary} />
        </View>
      </View>

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
              message="Chats about bookings will appear here."
            />
          }
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sender: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray800,
    marginRight: SPACING.sm,
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
  },
  message: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 3,
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
  statusPill: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.neutralText,
    textTransform: 'capitalize',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: SPACING.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
});

export default ChatsScreen;

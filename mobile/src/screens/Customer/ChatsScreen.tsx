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
import StatusBadge from '../../components/StatusBadge';
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

const AVATAR_COLORS = [
  COLORS.primary600,
  COLORS.indigo,
  COLORS.purple,
  COLORS.teal,
  COLORS.warningText,
  COLORS.infoText,
];

const isDirect = (c: Conv): c is DirectConv => 'other_user' in c;

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

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
    const title = `${item.service?.name ?? 'Booking'} #${item.id}`;
    const last = item.messages?.[0];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => openBookingChat(item)}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: avatarColor(title) }]}>
            <Text style={styles.avatarText}>{title.trim()[0]}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.sender} numberOfLines={1}>
              {title}
            </Text>
            {last?.created_at ? (
              <Text style={styles.time}>{shortTime(last.created_at)}</Text>
            ) : null}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {item.customer?.name ?? 'Customer'} · {item.vendor?.user?.name ?? item.vendor?.business_name ?? 'Vendor'}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={styles.message} numberOfLines={1}>
              {last?.message ?? 'No messages yet'}
            </Text>
            <StatusBadge status={item.status} />
          </View>
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
      <View style={styles.avatarWrap}>
        <View
          style={[styles.avatar, { backgroundColor: avatarColor(item.other_user.name) }]}
        >
          <Text style={styles.avatarText}>{item.other_user.name.trim()[0]?.toUpperCase()}</Text>
        </View>
        {item.unread_count > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread_count}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.sender} numberOfLines={1}>
            {item.other_user.name}
          </Text>
          {item.last_at ? <Text style={styles.time}>{shortTime(item.last_at)}</Text> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.other_user.role}
        </Text>
        <Text
          style={[styles.message, item.unread_count > 0 && styles.messageUnread]}
          numberOfLines={1}
        >
          {item.last_message}
        </Text>
      </View>
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
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  avatarWrap: {
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
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
    gap: SPACING.sm,
    marginTop: 3,
  },
  message: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray500,
  },
  messageUnread: {
    color: COLORS.gray800,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: COLORS.gray400,
  },
});

export default ChatsScreen;
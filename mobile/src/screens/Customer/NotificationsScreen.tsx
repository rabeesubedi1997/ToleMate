import React, { useState, useCallback, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  booking: 'event-note',
  message: 'chat-bubble',
  review: 'star',
  payment: 'payments',
  coupon: 'local-offer',
  system: 'campaign',
  vendor: 'storefront',
};

const NotificationsScreen: React.FC = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (reset = false) => {
    try {
      const nextPage = reset ? 1 : pageRef.current;
      const res = await api.get('/notifications', {
        params: { page: nextPage, per_page: 20 },
      });
      const rows: NotificationItem[] = res.data.data ?? res.data ?? [];
      setItems(prev => (reset ? rows : [...prev, ...rows]));
      pageRef.current = nextPage + 1;
      hasMoreRef.current = (res.data?.next_page_url ?? null) !== null && rows.length > 0;
    } catch (e) {
      console.warn('notifications load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const markRead = async (item: NotificationItem) => {
    if (item.is_read) return;
    setItems(prev =>
      prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n)),
    );
    try {
      await api.put(`/notifications/${item.id}/read`);
    } catch {
      setItems(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: false } : n)),
      );
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read');
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.warn('mark all read failed', e);
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const icon = TYPE_ICONS[item.type] ?? 'notifications';
    const time = new Date(item.created_at);
    const timeLabel = time.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return (
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.cardUnread]}
        activeOpacity={0.7}
        onPress={() => markRead(item)}
      >
        <View style={[styles.icon, !item.is_read && styles.iconUnread]}>
          <MaterialIcons
            name={icon}
            size={16}
            color={item.is_read ? COLORS.gray500 : COLORS.primary}
          />
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text
              style={[styles.itemTitle, !item.is_read && styles.itemTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.is_read ? <View style={styles.dot} /> : null}
          </View>
          {item.message ? (
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
          ) : null}
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ToleMate</Text>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.readAllBtn}
              onPress={markAllRead}
              disabled={markingAll}
            >
              <MaterialIcons
                name="done-all"
                size={16}
                color={COLORS.primary700}
              />
              <Text style={styles.readAllText}>
                {markingAll ? '...' : 'Read all'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.headerBadge}>
            <MaterialIcons
              name="notifications"
              size={20}
              color={COLORS.primary}
            />
            {unreadCount > 0 ? (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeDotText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
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
                load(true);
              }}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={() => {
            if (hasMoreRef.current && !loadingMore) {
              setLoadingMore(true);
              load();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={styles.footerLoader}
                size="small"
                color={COLORS.primary}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              message="Updates about your bookings will appear here."
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary700,
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
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  footerLoader: {
    paddingVertical: SPACING.md,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  cardUnread: {
    borderColor: COLORS.primary200,
    backgroundColor: COLORS.primary50,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  iconUnread: {
    backgroundColor: COLORS.primary100,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
    marginRight: SPACING.sm,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: COLORS.gray900,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  message: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
    lineHeight: 17,
  },
  time: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 3,
  },
});

export default NotificationsScreen;

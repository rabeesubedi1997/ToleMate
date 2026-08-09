import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import FilterChips from '../../components/FilterChips';
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

const FILTERS = ['all', 'unread', 'booking', 'message', 'payment', 'review', 'system'];

const PREF_KEY = 'tolemate_notif_prefs';
const SMS_PREF_KEY = 'tolemate_sms_pref';
const DEFAULT_PREFS = { booking: true, message: true, payment: true, review: true, system: true };

const NotificationsScreen: React.FC = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [smsEnabled, setSmsEnabled] = useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then(raw => {
      if (raw) {
        try {
          setPrefs(prev => ({ ...prev, ...JSON.parse(raw) }));
        } catch {}
      }
    });
    AsyncStorage.getItem(SMS_PREF_KEY).then(raw => {
      if (raw) {
        try {
          setSmsEnabled(JSON.parse(raw) === true);
        } catch {}
      }
    });
  }, []);

  const load = useCallback(
    async (reset = false) => {
      try {
        const nextPage = reset ? 1 : pageRef.current;
        const params: Record<string, string> = { page: String(nextPage), per_page: '20' };
        if (filter === 'unread') params.unread_only = '1';
        else if (filter !== 'all') params.type = filter;
        const res = await api.get('/notifications', { params });
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
    },
    [filter],
  );

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  const togglePref = (key: string) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(PREF_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const toggleSms = async () => {
    const next = !smsEnabled;
    setSmsEnabled(next);
    AsyncStorage.setItem(SMS_PREF_KEY, JSON.stringify(next)).catch(() => {});
    try {
      await api.put('/user/profile', { sms_notifications: next });
    } catch {
      // ignore — preference stays local
    }
  };

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
        {!item.is_read ? <View style={styles.unreadBar} /> : null}
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

      <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />

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
          ListHeaderComponent={
            <>
              <View style={styles.prefsCard}>
                <TouchableOpacity
                  style={styles.prefsHeader}
                  activeOpacity={0.7}
                  onPress={() => setShowPrefs(s => !s)}
                >
                  <View style={styles.prefsTitleRow}>
                    <MaterialIcons name="settings" size={16} color={COLORS.gray500} />
                    <Text style={styles.prefsTitle}>Notification preferences</Text>
                  </View>
                  <MaterialIcons
                    name={showPrefs ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={20}
                    color={COLORS.gray400}
                  />
                </TouchableOpacity>
                {showPrefs ? (
                  <View style={styles.prefsBody}>
                    {Object.entries(prefs).map(([key, val]) => (
                      <View key={key} style={styles.prefRow}>
                        <Text style={styles.prefLabel}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Text>
                        <Switch
                          value={val}
                          onValueChange={() => togglePref(key)}
                          trackColor={{ true: COLORS.primary, false: COLORS.gray300 }}
                          thumbColor={COLORS.white}
                        />
                      </View>
                    ))}
                    <View style={[styles.prefRow, styles.prefRowSms]}>
                      <View>
                        <Text style={styles.prefLabel}>SMS Notifications</Text>
                        <Text style={styles.prefHint}>
                          Receive booking updates via SMS
                        </Text>
                      </View>
                      <Switch
                        value={smsEnabled}
                        onValueChange={toggleSms}
                        trackColor={{ true: COLORS.primary, false: COLORS.gray300 }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            </>
          }
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
    marginTop: SPACING.xxl * 2,
  },
  prefsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  prefsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  prefsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  prefsBody: {
    paddingBottom: SPACING.sm,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  prefRowSms: {
    alignItems: 'flex-start',
    gap: 8,
  },
  prefLabel: {
    fontSize: 14,
    color: COLORS.dark,
  },
  prefHint: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 1,
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
    borderColor: COLORS.gray100,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  cardUnread: {
    borderColor: COLORS.primary200,
    backgroundColor: COLORS.primary50,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.primary,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  iconUnread: {
    backgroundColor: COLORS.primary100,
    borderColor: COLORS.primary200,
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
    fontSize: 13,
    color: COLORS.gray600,
    marginTop: 2,
    lineHeight: 18,
  },
  time: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 4,
  },
});

export default NotificationsScreen;

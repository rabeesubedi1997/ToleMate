import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation, NavigationProp } from '@react-navigation/native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import AdminHeader from '../../components/AdminHeader';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
import { MainStackParamList, AdminTabParamList } from '../../navigation/types';

interface Stats {
  total_users: number;
  total_vendors: number;
  total_services: number;
  active_services: number;
  total_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  pending_services?: number;
  monthly?: { month: string; bookings: number; revenue: number }[];
  recent_activity?: { type: string; text: string; time: string; status?: string }[];
}

interface ActivityItem {
  type: string;
  text: string;
  time: string;
  status?: string;
}

const ACTIVITY_ICONS: Record<string, string> = {
  user: 'person',
  booking: 'event',
  service: 'build',
  vendor: 'storefront',
  payment: 'payments',
  default: 'history',
};

const AdminOverviewScreen: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const navigation =
    useNavigation<NavigationProp<AdminTabParamList & MainStackParamList>>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      const data = res.data;
      setStats(data);
      setActivity(data.recent_activity ?? []);
      if (isSuperAdmin) {
        try {
          const logs = await api.get('/super-admin/activity-logs', {
            params: { per_page: 20 },
          });
          const items = (logs.data.data ?? []).map((log: any) => ({
            type: 'default',
            text: `${log.user?.name ?? 'System'} — ${String(log.action).replace(
              /[._]/g,
              ' ',
            )}`,
            time: log.created_at,
            status: log.new_values?.role,
          }));
          if (items.length > 0) {
            setActivity(items);
          }
        } catch {
          // activity-logs is super_admin only; keep stats feed otherwise
        }
      }
    } catch (e) {
      console.warn('admin overview load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const maxBookings = Math.max(
    1,
    ...(stats?.monthly?.map(m => m.bookings) ?? [1]),
  );

  return (
    <ScrollView
      style={styles.container}
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
    >
      <AdminHeader
        title="Overview"
        subtitle={isSuperAdmin ? 'Super Admin workspace' : 'Admin workspace'}
      />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <>
          {isSuperAdmin && (stats?.pending_services ?? 0) > 0 ? (
            <TouchableOpacity
              style={styles.moderationBanner}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminModeration' as never)}
            >
              <View style={styles.moderationIcon}>
                <MaterialIcons name="verified" size={20} color={COLORS.warningText} />
              </View>
              <View style={styles.moderationBody}>
                <Text style={styles.moderationTitle}>
                  {stats?.pending_services ?? 0}{' '}
                  {(stats?.pending_services ?? 0) > 1
                    ? 'services'
                    : 'service'}{' '}
                  awaiting review
                </Text>
                <Text style={styles.moderationSub}>
                  Vendor added new services — tap to verify
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={COLORS.gray400} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.statsRow}>
            <StatCard
              label="Total Users"
              value={stats?.total_users ?? 0}
              icon="people"
              tint={COLORS.primary}
              onPress={() => navigation.navigate('Users' as never)}
            />
            <StatCard
              label="Vendors"
              value={stats?.total_vendors ?? 0}
              icon="storefront"
              tint={COLORS.infoText}
              onPress={() => navigation.navigate('Vendors' as never)}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Services"
              value={stats?.total_services ?? 0}
              icon="handyman"
              tint={COLORS.warningText}
              onPress={() => navigation.navigate('AdminServices' as never)}
            />
            <StatCard
              label="Bookings"
              value={stats?.total_bookings ?? 0}
              icon="event"
              tint={COLORS.purple}
              onPress={() => navigation.navigate('AdminBookings' as never)}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Pending Bookings"
              value={stats?.pending_bookings ?? 0}
              icon="schedule"
              tint={COLORS.warningText}
              onPress={() => navigation.navigate('AdminBookings' as never)}
            />
            <StatCard
              label="Completed"
              value={stats?.completed_bookings ?? 0}
              icon="check-circle"
              tint={COLORS.successText}
              onPress={() => navigation.navigate('AdminBookings' as never)}
            />
          </View>

          {stats?.monthly && stats.monthly.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Bookings</Text>
              <View style={styles.chart}>
                {stats.monthly.map(m => (
                  <View key={m.month} style={styles.barCol}>
                    <Text style={styles.barValue}>
                      {m.bookings > 0 ? m.bookings : ''}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(
                            4,
                            (m.bookings / maxBookings) * 70,
                          ),
                          backgroundColor:
                            m.bookings > 0
                              ? COLORS.primary
                              : COLORS.gray200,
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{m.month}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            {activity.length === 0 ? (
              <Text style={styles.emptyText}>No recent activity</Text>
            ) : (
              activity.slice(0, 10).map((item, i) => (
                <View key={i} style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <MaterialIcons
                      name={ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.default}
                      size={16}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.activityBody}>
                    <Text style={styles.activityText} numberOfLines={2}>
                      {item.text}
                    </Text>
                    <Text style={styles.activityTime}>{item.time}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
  },
  moderationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.warningText,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    ...SHADOW.card,
  },
  moderationIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  moderationBody: {
    flex: 1,
  },
  moderationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  moderationSub: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.gray500,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    ...SHADOW.card,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    color: COLORS.gray500,
    marginBottom: 2,
  },
  bar: {
    width: 18,
    borderRadius: 4,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  emptyText: {
    color: COLORS.gray500,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  activityBody: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: COLORS.gray800,
    fontWeight: '500',
  },
  activityTime: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.gray400,
  },
});

export default AdminOverviewScreen;

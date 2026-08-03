import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import StatCard from '../../components/StatCard';
import AdminHeader from '../../components/AdminHeader';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Analytics {
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  active_bookings: number;
  total_revenue: string | number;
  total_commission: string | number;
  net_earnings: string | number;
  avg_response_hours?: number;
  completion_rate?: number;
  avg_rating?: number;
  review_count?: number;
  monthly?: Record<string, { month: string; bookings: number; revenue: string }>;
  top_services?: {
    id: number;
    name: string;
    bookings_count: number;
    price: string | number | null;
  }[];
}

const VendorDashboardScreen: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/vendor/analytics');
      setData(res.data);
    } catch (e) {
      console.warn('vendor analytics load failed', e);
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

  const monthly = data?.monthly
    ? Object.values(data.monthly)
    : [];
  const maxBookings = Math.max(1, ...monthly.map(m => m.bookings));

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
        title="Dashboard"
        subtitle="Your business at a glance"
        brand="ToleMate Partner"
      />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard
              label="Total Bookings"
              value={data?.total_bookings ?? 0}
              icon="event"
              tint={COLORS.primary}
            />
            <StatCard
              label="Active"
              value={data?.active_bookings ?? 0}
              icon="schedule"
              tint={COLORS.infoText}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Completed"
              value={data?.completed_bookings ?? 0}
              icon="check-circle"
              tint={COLORS.successText}
            />
            <StatCard
              label="Cancelled"
              value={data?.cancelled_bookings ?? 0}
              icon="cancel"
              tint={COLORS.rose}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Revenue"
              value={`Rs ${Number(data?.total_revenue ?? 0).toLocaleString()}`}
              icon="payments"
              tint={COLORS.purple}
            />
            <StatCard
              label="Net Earnings"
              value={`Rs ${Number(data?.net_earnings ?? 0).toLocaleString()}`}
              icon="savings"
              tint={COLORS.successText}
            />
          </View>

          {monthly.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bookings by Month</Text>
              <View style={styles.chart}>
                {monthly.map(m => (
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

          {data?.top_services && data.top_services.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Services</Text>
              {data.top_services.map(s => (
                <View key={s.id} style={styles.serviceRow}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.serviceMeta}>
                    {s.bookings_count} bookings
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Performance</Text>
            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>Average rating</Text>
              <Text style={styles.perfValue}>
                {Number(data?.avg_rating ?? 0).toFixed(1)} ★ ({data?.review_count ?? 0} reviews)
              </Text>
            </View>
            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>Completion rate</Text>
              <Text style={styles.perfValue}>
                {Math.round((data?.completion_rate ?? 0) * 100)}%
              </Text>
            </View>
            <View style={styles.perfRow}>
              <Text style={styles.perfLabel}>Avg response time</Text>
              <Text style={styles.perfValue}>
                {data?.avg_response_hours != null
                  ? `${data.avg_response_hours}h`
                  : '—'}
              </Text>
            </View>
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
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  serviceName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  serviceMeta: {
    fontSize: 12,
    color: COLORS.gray500,
    marginLeft: SPACING.sm,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  perfLabel: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  perfValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
  },
});

export default VendorDashboardScreen;

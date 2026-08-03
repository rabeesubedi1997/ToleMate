import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW, FONT_SIZE } from '../../theme';

interface VendorService {
  id: number;
  name: string;
  price?: string | number | null;
  pricing_type?: string | null;
  status: string;
  is_active: boolean;
  bookings_count?: number;
}

const VendorServicesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/services', { params: { per_page: 100 } });
      setServices(res.data.data ?? res.data);
    } catch (e) {
      console.warn('vendor services load failed', e);
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

  const renderService = ({ item }: { item: VendorService }) => (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.price}>
          {item.price != null ? `Rs ${item.price}` : 'Price on request'}
          {item.pricing_type ? ` · ${item.pricing_type}` : ''}
        </Text>
        {item.bookings_count != null ? (
          <Text style={styles.meta}>{item.bookings_count} bookings</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <StatusBadge status={item.status} />
        <View style={styles.activeRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: item.is_active ? COLORS.successText : COLORS.gray400 },
            ]}
          />
          <Text style={styles.activeText}>
            {item.is_active ? 'live' : 'offline'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.title}>My Services</Text>
        <Text style={styles.count}>{services.length} total</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={services}
          keyExtractor={item => String(item.id)}
          renderItem={renderService}
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
              title="No services yet"
              message="Create your first service to start getting bookings."
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  count: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    padding: SPACING.md,
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
  body: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  price: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  meta: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.gray500,
  },
  right: {
    alignItems: 'flex-end',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  activeText: {
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: '600',
  },
});

export default VendorServicesScreen;

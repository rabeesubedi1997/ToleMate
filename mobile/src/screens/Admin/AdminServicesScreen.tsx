import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Service {
  id: number;
  name: string;
  price: string;
  sale_price?: string | null;
  pricing_type: string;
  status: string;
  is_active: boolean;
  created_at: string;
  category?: { id: number; name?: string } | null;
  vendor?: { id: number; business_name?: string } | null;
}

const STATUSES = ['all', 'pending', 'approved', 'rejected', 'draft'];

const AdminServicesScreen: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { per_page: '100' };
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/services', { params });
      setServices(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('admin services load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = (item: Service) => {
    Alert.alert('Delete service', `Delete "${item.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/services/${item.id}`);
            load();
          } catch (e: any) {
            Alert.alert(
              'Failed',
              e?.response?.data?.message ?? 'Could not delete service.',
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Service }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {item.vendor?.business_name ?? '—'} · {item.category?.name ?? '—'}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={styles.price}>Rs {item.price}</Text>
        <View style={styles.actions}>
          <View style={styles.activeRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: item.is_active ? COLORS.successText : COLORS.gray400 },
              ]}
            />
            <Text style={styles.activeText}>
              {item.is_active ? 'live' : 'hidden'}
            </Text>
          </View>
          <Pressable
            onPress={() => remove(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.time}>{item.pricing_type}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Services" subtitle="All services on the platform" />
      <FilterChips options={STATUSES} selected={filter} onSelect={setFilter} />

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
            <EmptyState title="No services" message="No services match this filter." />
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
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  title: {
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
    marginTop: SPACING.sm,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  activeText: {
    fontSize: 11,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  time: {
    marginTop: SPACING.xs,
    fontSize: 11,
    color: COLORS.gray400,
  },
});

export default AdminServicesScreen;

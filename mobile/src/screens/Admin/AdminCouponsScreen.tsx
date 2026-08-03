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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_discount?: number | null;
  max_uses?: number | null;
  used_count: number;
  expires_at?: string | null;
  is_active: boolean;
  description?: string | null;
}

const AdminCouponsScreen: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/coupons');
      setCoupons(res.data ?? []);
    } catch (e) {
      console.warn('admin coupons load failed', e);
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

  const toggleActive = async (coupon: Coupon) => {
    try {
      await api.put(`/admin/coupons/${coupon.id}`, {
        is_active: !coupon.is_active,
      });
      load();
    } catch {
      Alert.alert('Failed', 'Could not update coupon.');
    }
  };

  const remove = (coupon: Coupon) => {
    Alert.alert('Delete coupon', `Delete ${coupon.code}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/coupons/${coupon.id}`);
            load();
          } catch {
            Alert.alert('Failed', 'Could not delete coupon.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Coupon }) => {
    const expired =
      item.expires_at && new Date(item.expires_at).getTime() < Date.now();
    const discount =
      item.discount_type === 'percent'
        ? `${item.discount_value}%`
        : `Rs ${item.discount_value}`;
    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.code}>{item.code}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, !item.is_active && styles.actionOn]}
              onPress={() => toggleActive(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialIcons
                name={item.is_active ? 'toggle-on' : 'toggle-off'}
                size={22}
                color={item.is_active ? COLORS.primary : COLORS.gray400}
              />
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => remove(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialIcons name="delete-outline" size={20} color={COLORS.rose} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.discount}>{discount}</Text>
        <Text style={styles.meta} numberOfLines={2}>
          Min order Rs {item.min_order}
          {item.max_discount ? ` · max Rs ${item.max_discount}` : ''} · Used{' '}
          {item.used_count}
          {item.max_uses ? `/${item.max_uses}` : ''}
        </Text>
        <View style={styles.bottomRow}>
          {expired ? (
            <View style={styles.expiredPill}>
              <Text style={styles.expiredText}>expired</Text>
            </View>
          ) : (
            <View style={styles.onPill}>
              <Text style={styles.onText}>{item.is_active ? 'active' : 'disabled'}</Text>
            </View>
          )}
          <Text style={styles.date}>
            {item.expires_at
              ? `Expires ${new Date(item.expires_at).toLocaleDateString()}`
              : 'No expiry'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Coupons" subtitle="Discount codes" />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={coupons}
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
            <EmptyState title="No coupons" message="Coupons will appear here." />
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
  },
  code: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary700,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionBtn: {
    padding: 2,
  },
  actionOn: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: RADIUS.pill,
  },
  discount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: SPACING.xs,
  },
  meta: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  onPill: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  onText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.successText,
    textTransform: 'capitalize',
  },
  expiredPill: {
    backgroundColor: COLORS.roseBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expiredText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.roseText,
  },
  date: {
    fontSize: 11,
    color: COLORS.gray400,
  },
});

export default AdminCouponsScreen;

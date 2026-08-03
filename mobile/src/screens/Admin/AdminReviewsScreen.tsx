import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Review {
  id: number;
  rating: number;
  comment: string;
  vendor_reply?: string | null;
  created_at: string;
  customer?: { id: number; name?: string } | null;
  vendor?: { id: number; business_name?: string } | null;
  booking?: { id: number; service?: { name?: string } | null } | null;
}

const AdminReviewsScreen: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/reviews', { params: { per_page: 100 } });
      setReviews(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('admin reviews load failed', e);
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

  const renderItem = ({ item }: { item: Review }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(n => (
            <MaterialIcons
              key={n}
              name={n <= item.rating ? 'star' : 'star-border'}
              size={14}
              color={COLORS.star}
            />
          ))}
        </View>
        <Text style={styles.time}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.comment}>{item.comment || '—'}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {item.customer?.name ?? 'Customer'} on {item.vendor?.business_name ?? 'vendor'}
      </Text>
      <Text style={styles.service} numberOfLines={1}>
        {item.booking?.service?.name ?? ''}
      </Text>
      {item.vendor_reply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>Vendor reply</Text>
          <Text style={styles.replyText}>{item.vendor_reply}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Reviews" subtitle="Customer feedback across vendors" />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={reviews}
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
            <EmptyState title="No reviews yet" message="Reviews will appear here." />
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
  stars: {
    flexDirection: 'row',
  },
  time: {
    fontSize: 11,
    color: COLORS.gray400,
  },
  comment: {
    fontSize: 13,
    color: COLORS.gray800,
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  service: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 2,
  },
  replyBox: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  replyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.neutralText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyText: {
    fontSize: 12,
    color: COLORS.gray700,
    marginTop: 2,
  },
});

export default AdminReviewsScreen;

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../api/client';
import { COLORS, SPACING } from '../../theme';
import AppImage from '../../components/AppImage';
import ServiceCard, { Service } from '../../components/ServiceCard';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'VendorPublic'>;

interface VendorData {
  vendor: {
    id: number;
    business_name: string;
    description?: string | null;
    rating?: string | number | null;
    is_verified?: boolean;
    avatar?: string | null;
    service_radius_km?: number | null;
    website?: string | null;
    user?: {
      id: number;
      name?: string;
      created_at?: string;
      phone?: string | null;
    } | null;
    services?: Service[];
  };
  review_count: number;
  completed_jobs: number;
  avg_response_hours?: number | null;
  badges?: string[];
}

interface Review {
  id: number;
  rating: number;
  comment?: string | null;
  customer?: { id: number; name?: string } | null;
  created_at?: string;
}

interface PortfolioItem {
  id: number;
  title?: string | null;
  image_path?: string | null;
}

const VendorPublicProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [data, setData] = useState<VendorData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'services' | 'reviews'>('services');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [vendorRes, portfolioRes] = await Promise.all([
          api.get(`/vendors/${id}`),
          api.get(`/vendors/${id}/portfolio`),
        ]);
        if (mounted) {
          setData(vendorRes.data);
          setPortfolio(portfolioRes.data.portfolio ?? []);
        }
      } catch (e) {
        console.warn('vendor load failed', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const fetchReviews = useCallback(
    async (pageNum: number) => {
      try {
        const res = await api.get(`/vendors/${id}/reviews`, {
          params: { page: pageNum },
        });
        const items = res.data.data ?? [];
        setReviews(prev => (pageNum === 1 ? items : [...prev, ...items]));
        setReviewPage(res.data.current_page ?? pageNum);
        setHasMore((res.data.current_page ?? pageNum) < (res.data.last_page ?? 1));
      } catch (e) {
        console.warn('reviews load failed', e);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const vendor = data?.vendor;
  if (!vendor) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Vendor not found</Text>
      </View>
    );
  }

  const loadMoreReviews = () => {
    if (hasMore) {
      fetchReviews(reviewPage + 1);
    }
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewName}>
          {item.customer?.name ?? 'Customer'}
        </Text>
        <Text style={styles.reviewRating}>
          {'★'.repeat(Math.max(0, Math.min(5, item.rating || 0)))}
        </Text>
      </View>
      {item.comment ? (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      ) : null}
    </View>
  );

  const services = vendor.services ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <AppImage
            uri={vendor.avatar}
            style={styles.coverAvatar}
          />
          <Text style={styles.businessName}>{vendor.business_name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              ★ {vendor.rating ? Number(vendor.rating).toFixed(1) : 'New'}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{data?.review_count ?? 0} reviews</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {data?.completed_jobs ?? 0} jobs done
            </Text>
          </View>
          {data?.badges && data.badges.length > 0 ? (
            <View style={styles.badgesRow}>
              {data.badges.map((b, i) => (
                <View key={i} style={styles.badge}>
                  <MaterialIcons name="verified" size={12} color={COLORS.white} />
                  <Text style={styles.badgeText}>{b.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {vendor.description ? (
            <Text style={styles.bio}>{vendor.description}</Text>
          ) : null}
        </View>

        {/* Portfolio strip */}
        {portfolio.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={portfolio}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <AppImage uri={item.image_path} style={styles.portfolioImg} />
              )}
              contentContainerStyle={styles.portfolioList}
              nestedScrollEnabled
            />
          </View>
        ) : null}

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['services', 'reviews'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text
                style={[styles.tabText, tab === t && styles.tabTextActive]}
              >
                {t === 'services' ? 'Services' : 'Reviews'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'services' ? (
          services.length > 0 ? (
            <View style={styles.grid}>
              {services.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onPress={s =>
                    navigation.navigate('ServiceDetail', { id: s.id })
                  }
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No services listed yet.</Text>
          )
        ) : (
          <View>
            {reviews.map(item => (
              <View key={item.id}>{renderReview({ item })}</View>
            ))}
            {hasMore ? (
              <TouchableOpacity onPress={loadMoreReviews} style={styles.moreBtn}>
                <Text style={styles.moreText}>Load more reviews</Text>
              </TouchableOpacity>
            ) : null}
            {reviews.length === 0 ? (
              <Text style={styles.emptyText}>No reviews yet.</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.slate500,
  },
  hero: {
    backgroundColor: COLORS.dark,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  backBtn: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  businessName: {
    marginTop: SPACING.sm,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  metaDot: {
    color: '#cbd5e1',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  bio: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 19,
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  portfolioList: {
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  portfolioImg: {
    width: 120,
    height: 90,
    borderRadius: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.gray200,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate600,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.slate500,
    padding: SPACING.xl,
    fontSize: 14,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  reviewRating: {
    fontSize: 13,
    color: COLORS.accent,
  },
  reviewComment: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.slate600,
    lineHeight: 19,
  },
  moreBtn: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  moreText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default VendorPublicProfileScreen;

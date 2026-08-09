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
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
import AppImage from '../../components/AppImage';
import ServiceCard, { Service } from '../../components/ServiceCard';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'VendorPublic'>;

const FAV_VENDORS = 'tolemate_fav_vendors';

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

interface BundleItem {
  id: number;
  name: string;
  description?: string | null;
  bundle_price: number | string;
  discount_percent?: number | null;
  services?: { id: number; name: string }[];
}

const VendorPublicProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [data, setData] = useState<VendorData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [bundles, setBundles] = useState<BundleItem[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'services' | 'reviews'>('services');
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FAV_VENDORS).then(raw => {
      if (raw) {
        const ids: number[] = JSON.parse(raw);
        setIsFav(ids.includes(id));
      }
    });
  }, [id]);

  const toggleFav = useCallback(async () => {
    const next = !isFav;
    setIsFav(next);
    try {
      const raw = await AsyncStorage.getItem(FAV_VENDORS);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      const updated = next ? [...ids, id] : ids.filter(x => x !== id);
      await AsyncStorage.setItem(FAV_VENDORS, JSON.stringify(updated));
    } catch {
      setIsFav(!next);
    }
  }, [isFav, id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [vendorRes, portfolioRes, bundleRes] = await Promise.all([
          api.get(`/vendors/${id}`),
          api.get(`/vendors/${id}/portfolio`),
          api.get(`/vendors/${id}/bundles`).catch(() => null),
        ]);
        if (mounted) {
          setData(vendorRes.data);
          setPortfolio(portfolioRes.data.portfolio ?? []);
          setBundles(bundleRes?.data?.bundles ?? bundleRes?.data ?? []);
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => navigation.goBack()}
            hitSlop={6}
          >
            <MaterialIcons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.circleBtn, styles.favBtn]}
            onPress={toggleFav}
            hitSlop={6}
          >
            <MaterialIcons
              name={isFav ? 'favorite' : 'favorite-border'}
              size={22}
              color={isFav ? COLORS.rose : COLORS.white}
            />
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

        {/* Body */}
        <View style={styles.body}>
          {/* Portfolio strip */}
          {portfolio.length > 0 ? (
            <View style={styles.cardBlock}>
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

          {/* Bundles */}
          {bundles.length > 0 ? (
            <View style={styles.bundlesWrap}>
              <Text style={styles.sectionTitle}>Service Bundles</Text>
              {bundles.map(b => (
                <View key={b.id} style={styles.bundleCard}>
                  <View style={styles.bundleTop}>
                    <Text style={styles.bundleName} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.bundlePrice}>Rs {b.bundle_price}</Text>
                  </View>
                  {b.description ? (
                    <Text style={styles.bundleDesc} numberOfLines={2}>
                      {b.description}
                    </Text>
                  ) : null}
                  {b.services && b.services.length > 0 ? (
                    <View style={styles.bundleServices}>
                      {b.services.map(s => (
                        <View key={s.id} style={styles.bundleServiceChip}>
                          <Text style={styles.bundleServiceText} numberOfLines={1}>
                            {s.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {(['services', 'reviews'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.8}
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
            <View style={styles.reviewsWrap}>
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
        </View>
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
  scroll: {
    paddingBottom: SPACING.xl,
  },
  hero: {
    backgroundColor: COLORS.dark,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  bio: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 19,
  },
  circleBtn: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: {
    left: undefined,
    right: SPACING.md,
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
    fontWeight: '800',
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
  body: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  cardBlock: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  portfolioList: {
    gap: SPACING.sm,
  },
  portfolioImg: {
    width: 120,
    height: 90,
    borderRadius: RADIUS.md,
  },
  bundlesWrap: {
    marginBottom: SPACING.md,
  },
  bundleCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  bundleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bundleName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  bundlePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  bundleDesc: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  bundleServices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  bundleServiceChip: {
    backgroundColor: COLORS.gray100,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bundleServiceText: {
    fontSize: 11,
    color: COLORS.gray600,
    fontWeight: '600',
    maxWidth: 150,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.pill,
    padding: 3,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray500,
    padding: SPACING.xl,
    fontSize: 14,
  },
  reviewsWrap: {
    gap: SPACING.sm,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  reviewRating: {
    fontSize: 13,
    color: COLORS.accent,
  },
  reviewComment: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.gray600,
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
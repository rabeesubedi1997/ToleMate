import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';
import AppImage from '../../components/AppImage';
import { ServiceDetailSkeleton } from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ServiceDetail'>;

const { width } = Dimensions.get('window');
const FAV_KEY = 'tolemate_favorites';

interface ServiceDetail {
  id: number;
  name: string;
  description?: string | null;
  price?: string | number | null;
  sale_price?: string | number | null;
  pricing_type?: string | null;
  rating?: string | number | null;
  tags?: string[] | null;
  category?: { id: number; name: string } | null;
  images?: { id: number; file_path: string }[];
  vendor?: {
    id: number;
    business_name?: string;
    rating?: string | number | null;
    is_verified?: boolean;
    avatar?: string | null;
    user?: { id: number; name?: string; phone?: string } | null;
  } | null;
  packages?: ServicePackage[];
}

interface ServicePackage {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  delivery_days?: number | null;
  features?: string[] | null;
}

interface Review {
  id: number;
  rating: number;
  comment?: string | null;
  vendor_reply?: string | null;
  created_at: string;
  customer?: { id: number; name?: string } | null;
}

const ServiceDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const toast = useToast();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .get(`/services/${id}`)
      .then(res => {
        if (mounted) {
          const svc = res.data.service;
          setService(svc);
          if (svc?.vendor?.id) {
            api
              .get(`/vendors/${svc.vendor.id}/reviews`)
              .then(r => {
                if (mounted) setReviews(r.data.data ?? r.data ?? []);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        toast.error('Could not load this service. Please try again.');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id, toast]);

  const toggleFav = useCallback(async () => {
    const next = !fav;
    setFav(next);
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      const updated = next ? [...ids, id] : ids.filter(x => x !== id);
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(updated));
      toast.success(next ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      setFav(!next);
    }
  }, [fav, id, toast]);

  useEffect(() => {
    AsyncStorage.getItem(FAV_KEY).then(raw => {
      if (raw) {
        const ids: number[] = JSON.parse(raw);
        setFav(ids.includes(id));
      }
    });
  }, [id]);

  const onBook = useCallback(() => {
    navigation.navigate('BookingForm', { id });
  }, [navigation, id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ServiceDetailSkeleton />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Service not found</Text>
      </View>
    );
  }

  const image = service.images?.[0]?.file_path ?? null;
  const vendor = service.vendor;
  const displayPrice = service.sale_price ?? service.price;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image */}
        <View>
          <AppImage uri={image} style={styles.hero} />
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.roundBtn}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={22} color={COLORS.gray900} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundBtn} onPress={toggleFav}>
              <MaterialIcons
                name={fav ? 'favorite' : 'favorite-border'}
                size={22}
                color={fav ? COLORS.rose : COLORS.gray900}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleFlex}>
              {service.category ? (
                <Text style={styles.kicker}>{service.category.name}</Text>
              ) : null}
              <Text style={styles.name}>{service.name}</Text>
            </View>
            {displayPrice !== null && displayPrice !== undefined ? (
              <Text style={styles.price}>Rs {displayPrice}</Text>
            ) : (
              <Text style={styles.price}>Price on request</Text>
            )}
          </View>

          {service.pricing_type === 'quote' ? (
            <Text style={styles.quoteNote}>
              Send a quote request to get a custom price
            </Text>
          ) : null}

          {service.tags && service.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {service.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Vendor card */}
          {vendor ? (
            <TouchableOpacity
              style={styles.vendorCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('VendorPublic', { id: vendor.id })
              }
            >
              <AppImage
                uri={vendor.avatar}
                style={styles.vendorAvatar}
              />
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>
                  {vendor.business_name ?? vendor.user?.name ?? 'Vendor'}
                </Text>
                <Text style={styles.vendorRating}>
                  ★{' '}
                  {vendor.rating
                    ? Number(vendor.rating).toFixed(1)
                    : 'New'}
                </Text>
              </View>
              {vendor.is_verified ? (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={14} color={COLORS.primary} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
              <MaterialIcons name="chevron-right" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          ) : null}

          {/* Description */}
          {service.description ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.kicker}>Details</Text>
                <Text style={styles.sectionTitle}>About this service</Text>
              </View>
              <View style={styles.descriptionCard}>
                <Text style={styles.description}>{service.description}</Text>
              </View>
            </View>
          ) : null}

          {/* Packages */}
          {service.packages && service.packages.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.kicker}>Pricing</Text>
                <Text style={styles.sectionTitle}>Choose a package</Text>
              </View>
              {service.packages.map(pkg => (
                <View key={pkg.id} style={styles.pkgCard}>
                  <View style={styles.pkgTop}>
                    <Text style={styles.pkgName}>{pkg.name}</Text>
                    <Text style={styles.pkgPrice}>Rs {pkg.price}</Text>
                  </View>
                  {pkg.description ? (
                    <Text style={styles.pkgDesc}>{pkg.description}</Text>
                  ) : null}
                  {(pkg.features ?? []).length > 0 ? (
                    <View style={styles.pkgFeatures}>
                      {pkg.features!.map((f, i) => (
                        <View key={i} style={styles.pkgFeatureRow}>
                          <View style={styles.checkIcon}>
                            <MaterialIcons
                              name="check"
                              size={12}
                              color={COLORS.primary700}
                            />
                          </View>
                          <Text style={styles.pkgFeatureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.pkgBottom}>
                    {pkg.delivery_days ? (
                      <Text style={styles.pkgDelivery}>
                        {pkg.delivery_days}d delivery
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      style={styles.pkgBookBtn}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate('BookingForm', {
                          id,
                          packageId: pkg.id,
                          packageName: pkg.name,
                          packagePrice: Number(pkg.price),
                        })
                      }
                    >
                      <Text style={styles.pkgBookText}>Book {pkg.name}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.kicker}>Feedback</Text>
              <Text style={styles.sectionTitle}>
                Reviews ({reviews.length})
              </Text>
            </View>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet.</Text>
            ) : (
              <>
                <View style={styles.avgCard}>
                  <Text style={styles.avgScore}>
                    {(
                      reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                    ).toFixed(1)}
                  </Text>
                  <View>
                    <Text style={styles.avgStars}>
                      {'★'.repeat(Math.round(
                        reviews.reduce((s, r) => s + r.rating, 0) /
                          reviews.length,
                      ))}
                      {'☆'.repeat(
                        5 -
                          Math.round(
                            reviews.reduce((s, r) => s + r.rating, 0) /
                              reviews.length,
                          ),
                      )}
                    </Text>
                    <Text style={styles.avgCount}>
                      {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                {reviews.slice(0, 5).map(r => (
                  <View key={r.id} style={styles.reviewItem}>
                    <View style={styles.reviewTop}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {(r.customer?.name ?? 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewInfo}>
                        <Text style={styles.reviewName}>
                          {r.customer?.name ?? 'Customer'}
                        </Text>
                        <Text style={styles.reviewStars}>
                          {'★'.repeat(r.rating)}
                          {'☆'.repeat(5 - r.rating)}
                        </Text>
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(r.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    {r.comment ? (
                      <Text style={styles.reviewComment}>{r.comment}</Text>
                    ) : null}
                    {r.vendor_reply ? (
                      <View style={styles.replyBox}>
                        <Text style={styles.replyLabel}>Vendor reply</Text>
                        <Text style={styles.replyText}>{r.vendor_reply}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.85}
          onPress={onBook}
        >
          <Text style={styles.bookBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray500,
  },
  hero: {
    width,
    height: 260,
  },
  topBar: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray100,
    ...SHADOW.card,
  },
  body: {
    padding: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleFlex: {
    flex: 1,
  },
  kicker: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  name: {
    marginTop: 2,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  price: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.primary700,
    marginLeft: SPACING.sm,
  },
  quoteNote: {
    marginTop: 6,
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary50,
    borderWidth: 1,
    borderColor: COLORS.primary100,
  },
  tagText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary700,
    fontWeight: '600',
  },
  vendorCard: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.sm + 4,
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  vendorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  vendorRating: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: SPACING.xs,
  },
  verifiedText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionHead: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: 2,
  },
  descriptionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  description: {
    fontSize: FONT_SIZE.base,
    lineHeight: 22,
    color: COLORS.gray600,
  },
  noReviews: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
  },
  pkgCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  pkgTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pkgName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  pkgPrice: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  pkgDesc: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  pkgFeatures: {
    marginTop: SPACING.sm,
    gap: 6,
  },
  pkgFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgFeatureText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray600,
  },
  pkgBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  pkgDelivery: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  pkgBookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 18,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgBookText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  avgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  avgScore: {
    fontSize: FONT_SIZE.hero,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  avgStars: {
    fontSize: FONT_SIZE.base,
    color: COLORS.accent,
    letterSpacing: 2,
  },
  avgCount: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
  },
  reviewItem: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary100,
  },
  reviewAvatarText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  reviewInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  reviewName: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  reviewStars: {
    marginTop: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  reviewDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
  },
  reviewComment: {
    marginTop: 6,
    fontSize: FONT_SIZE.sm,
    lineHeight: 19,
    color: COLORS.gray600,
  },
  replyBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  replyLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.primary700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyText: {
    marginTop: 3,
    fontSize: FONT_SIZE.sm,
    lineHeight: 19,
    color: COLORS.gray600,
  },
  ctaBar: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
});

export default ServiceDetailScreen;
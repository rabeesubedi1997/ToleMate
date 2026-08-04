import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../../api/client';
import { COLORS, SPACING } from '../../theme';
import AppImage from '../../components/AppImage';
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
        Alert.alert('Error', 'Could not load service.');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  const toggleFav = useCallback(async () => {
    const next = !fav;
    setFav(next);
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      const updated = next ? [...ids, id] : ids.filter(x => x !== id);
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(updated));
    } catch {
      setFav(!next);
    }
  }, [fav, id]);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View>
          <AppImage uri={image} style={styles.hero} />
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.roundBtn}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={22} color={COLORS.dark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundBtn} onPress={toggleFav}>
              <MaterialIcons
                name={fav ? 'favorite' : 'favorite-border'}
                size={22}
                color={fav ? COLORS.rose : COLORS.dark}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleFlex}>
              {service.category ? (
                <Text style={styles.category}>{service.category.name}</Text>
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
              <MaterialIcons name="chevron-right" size={20} color={COLORS.slate400} />
            </TouchableOpacity>
          ) : null}

          {/* Description */}
          {service.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this service</Text>
              <Text style={styles.description}>{service.description}</Text>
            </View>
          ) : null}

          {/* Packages */}
          {service.packages && service.packages.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose a package</Text>
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
                          <MaterialIcons
                            name="check"
                            size={14}
                            color={COLORS.primary}
                          />
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
            <Text style={styles.sectionTitle}>
              Reviews ({reviews.length})
            </Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>No reviews yet.</Text>
            ) : (
              <>
                <View style={styles.avgRow}>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
  category: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  name: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  quoteNote: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.primary50,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  vendorCard: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  vendorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  vendorInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  vendorRating: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: SPACING.sm,
  },
  verifiedText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  description: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.slate600,
  },
  noReviews: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.slate500,
  },
  pkgCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
  },
  pkgTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pkgName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  pkgPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pkgDesc: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.slate500,
    lineHeight: 18,
  },
  pkgFeatures: {
    marginTop: SPACING.sm,
    gap: 4,
  },
  pkgFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pkgFeatureText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.slate600,
  },
  pkgBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  pkgDelivery: {
    fontSize: 12,
    color: COLORS.slate500,
    fontWeight: '600',
  },
  pkgBookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pkgBookText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  avgScore: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.dark,
  },
  avgStars: {
    fontSize: 14,
    color: COLORS.accent,
    letterSpacing: 2,
  },
  avgCount: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.slate500,
  },
  reviewItem: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
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
  },
  reviewAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  reviewInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  reviewStars: {
    marginTop: 1,
    fontSize: 12,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.slate400,
  },
  reviewComment: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.slate600,
  },
  replyBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.gray50,
    borderRadius: 10,
    padding: SPACING.sm,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.slate600,
  },
  ctaBar: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray200,
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  bookBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ServiceDetailScreen;

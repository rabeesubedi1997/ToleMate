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
}

const ServiceDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .get(`/services/${id}`)
      .then(res => {
        if (mounted) {
          setService(res.data.service);
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
    Alert.alert('Coming soon', 'Booking flow arrives in Phase 2.');
  }, []);

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
            <View style={{ flex: 1 }}>
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

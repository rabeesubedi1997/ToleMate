import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AppImage from './AppImage';
import { COLORS, SPACING } from '../theme';

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  price?: string | number | null;
  sale_price?: string | number | null;
  pricing_type?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  images?: { id: number; file_path: string }[];
  vendor?: {
    id: number;
    business_name?: string;
    name?: string;
    avatar?: string | null;
    rating?: string | number | null;
    is_verified?: boolean;
    available_today?: boolean;
  } | null;
}

interface Props {
  service: Service;
  onPress?: (service: Service) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.md * 2 - SPACING.sm) / 2;

const ServiceCard: React.FC<Props> = ({ service, onPress }) => {
  const image = service.images?.[0]?.file_path ?? null;
  const displayPrice = service.sale_price ?? service.price;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress?.(service)}
    >
      <AppImage uri={image} style={styles.image} />
      {service.vendor?.available_today ? (
        <View style={styles.availableBadge}>
          <Text style={styles.availableText}>✓ Available today</Text>
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {service.name}
        </Text>
        <View style={styles.vendorRow}>
          <Text style={styles.vendor} numberOfLines={1}>
            {service.vendor?.business_name ?? service.vendor?.name ?? ''}
          </Text>
          {service.vendor?.is_verified ? (
            <MaterialIcons name="verified" size={13} color={COLORS.infoText} />
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          {service.rating ? (
            <Text style={styles.rating}>★ {Number(service.rating).toFixed(1)}</Text>
          ) : (
            <Text style={styles.rating}>New</Text>
          )}
          {displayPrice !== null && displayPrice !== undefined ? (
            <Text style={styles.price}>Rs {displayPrice}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 110,
  },
  availableBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.emerald,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  availableText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  body: {
    padding: SPACING.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  vendorRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vendor: {
    fontSize: 12,
    color: COLORS.slate500,
    flexShrink: 1,
  },
  bottomRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default ServiceCard;

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  DimensionValue,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme';

const PULSE_OPACITY = 0.55;

export const SkeletonBlock: React.FC<{
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ width = '100%', height = 14, radius = 6, style }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PULSE_OPACITY,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
};

export const ServiceCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <SkeletonBlock height={110} radius={0} />
    <View style={styles.cardBody}>
      <SkeletonBlock width="90%" height={14} />
      <SkeletonBlock width="60%" height={11} style={styles.rowGap} />
      <View style={styles.cardRow}>
        <SkeletonBlock width={48} height={12} />
        <SkeletonBlock width={64} height={12} />
      </View>
    </View>
  </View>
);

export const ServiceGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={styles.grid}>
    {Array.from({ length: count }).map((_, i) => (
      <ServiceCardSkeleton key={i} />
    ))}
  </View>
);

export const CategoryRowSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={styles.catRow}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.catItem}>
        <SkeletonBlock width={60} height={60} radius={18} />
        <SkeletonBlock width={64} height={11} style={styles.catGap} />
      </View>
    ))}
  </View>
);

export const BannerSkeleton: React.FC = () => (
  <SkeletonBlock height={180} radius={RADIUS.xl} style={styles.banner} />
);

export const ServiceDetailSkeleton: React.FC = () => (
  <View>
    <SkeletonBlock width="100%" height={240} radius={0} />
    <View style={styles.detailBody}>
      <SkeletonBlock width="75%" height={18} />
      <SkeletonBlock width="40%" height={16} style={styles.rowGap} />
      <SkeletonBlock width="100%" height={96} style={styles.detailGap} />
      <SkeletonBlock width="55%" height={18} style={styles.detailGap} />
      <SkeletonBlock width="100%" height={72} style={styles.rowGap} />
      <SkeletonBlock height={44} radius={10} style={styles.detailGap} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  block: {
    backgroundColor: COLORS.gray200,
  },
  banner: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  cardBody: {
    padding: SPACING.sm,
  },
  rowGap: {
    marginTop: 8,
  },
  cardRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  catRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  catItem: {
    alignItems: 'center',
  },
  catGap: {
    marginTop: 6,
  },
  detailBody: {
    padding: SPACING.md,
  },
  detailGap: {
    marginTop: SPACING.md,
  },
});
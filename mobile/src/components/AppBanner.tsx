import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../api/client';
import { assetUrl } from '../config';
import { COLORS, SPACING, RADIUS } from '../theme';

export interface Slide {
  url?: string;
  title?: string;
  subtitle?: string;
  link?: string;
  enabled?: boolean;
}

interface Props {
  height?: number;
  /** Called with the slide's link (e.g. "/services", "/services/5", "/vendors/3"). */
  onPressSlide?: (link: string) => void;
}

const DEFAULT_TITLE = 'Book Home Service Providers\nat Your Fingertips';
const DEFAULT_SUBTITLE =
  'Search, compare and match with verified professionals of your choice in 60 seconds.';

const AppBanner: React.FC<Props> = ({ height = 180, onPressSlide }) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_TITLE);
  const [heroSubtitle, setHeroSubtitle] = useState(DEFAULT_SUBTITLE);
  const [siteName, setSiteName] = useState('ToleMate');
  const [intervalMs, setIntervalMs] = useState(5000);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/settings')
      .then(res => {
        const data = res.data ?? {};
        if (data.site_name) setSiteName(data.site_name);
        if (data.hero_title) setHeroTitle(data.hero_title);
        if (data.hero_subtitle) setHeroSubtitle(data.hero_subtitle);
        try {
          const parsed = JSON.parse(data.slider_images || '[]');
          setSlides(parsed.filter((s: Slide) => s.enabled !== false));
        } catch {
          setSlides([]);
        }
        const iv = parseInt(data.slider_interval || '5000', 10);
        if (!isNaN(iv) && iv >= 1000) setIntervalMs(iv);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(t);
  }, [slides.length, intervalMs]);

  const current = slides.length > 0 ? slides[idx] : null;
  const imageUrl = current?.url ? assetUrl(current.url) : null;
  const title = current?.title || heroTitle;
  const subtitle = current?.subtitle || heroSubtitle;

  const handlePress = () => {
    if (current?.link) {
      onPressSlide?.(current.link);
    } else if (!current) {
      onPressSlide?.('/services');
    }
  };

  const content = (
    <LinearGradient
      colors={
        imageUrl
          ? ['rgba(15, 23, 42, 0.1)', 'rgba(15, 23, 42, 0.88)']
          : [COLORS.primary, COLORS.primaryDeep]
      }
      start={{ x: 0, y: 0.15 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{siteName}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Browse services</Text>
        <MaterialIcons name="arrow-forward" size={14} color={COLORS.primaryDeep} />
      </View>
    </LinearGradient>
  );

  const body = loading ? (
    <View style={[styles.fallback, { height }]}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDeep]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <ActivityIndicator color={COLORS.white} />
      </LinearGradient>
    </View>
  ) : imageUrl ? (
    <ImageBackground
      source={{ uri: imageUrl }}
      style={[styles.bg, { height }]}
      imageStyle={{ borderRadius: RADIUS.xl }}
    >
      {content}
    </ImageBackground>
  ) : (
    <View style={[styles.fallback, { height }]}>{content}</View>
  );

  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.92}
      onPress={handlePress}
    >
      {body}
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === idx && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  fallback: {
    width: '100%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  bg: {
    width: '100%',
  },
  gradient: {
    flex: 1,
    borderRadius: RADIUS.xl,
    justifyContent: 'flex-end',
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 5,
    lineHeight: 17,
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDeep,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 16,
  },
});

export default AppBanner;

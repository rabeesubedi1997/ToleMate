import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import api from '../api/client';
import { COLORS, SPACING, RADIUS } from '../theme';

interface Slide {
  url?: string;
  title?: string;
  link?: string;
  enabled?: boolean;
}

interface Props {
  height?: number;
}

const AppBanner: React.FC<Props> = ({ height = 180 }) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [heroTitle, setHeroTitle] = useState('Book Home Service Providers\nat Your Fingertips');
  const [heroSubtitle, setHeroSubtitle] = useState('Search, compare and match with verified professionals of your choice in 60 seconds.');
  const [siteName, setSiteName] = useState('ToleMate');
  const [intervalMs, setIntervalMs] = useState(5000);
  const [idx, setIdx] = useState(0);

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
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(t);
  }, [slides.length, intervalMs]);

  const current = slides[idx]?.url;

  const inner = (
    <LinearGradient
      colors={
        current
          ? ['rgba(20, 83, 45, 0.05)', 'rgba(20, 83, 45, 0.88)']
          : [COLORS.primary, COLORS.primaryDeep]
      }
      start={{ x: 0, y: 0.2 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{siteName}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {heroTitle}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {heroSubtitle}
      </Text>
    </LinearGradient>
  );

  return (
    <View style={[styles.wrap, { height }]}>
      {current ? (
        <ImageBackground
          source={{ uri: current }}
          style={styles.bg}
          imageStyle={{ borderRadius: RADIUS.xl }}
        >
          {inner}
        </ImageBackground>
      ) : (
        inner
      )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
    overflow: 'visible',
  },
  bg: {
    flex: 1,
    width: '100%',
  },
  gradient: {
    flex: 1,
    borderRadius: RADIUS.xl,
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 6,
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
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    lineHeight: 17,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 16,
  },
});

export default AppBanner;

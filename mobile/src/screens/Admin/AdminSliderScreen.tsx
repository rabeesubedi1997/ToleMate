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

interface Slide {
  url: string;
  title?: string;
  link?: string;
  enabled?: boolean;
}

const AdminSliderScreen: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [interval, setIntervalMs] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      setIntervalMs(res.data?.slider_interval ?? '');
      try {
        const parsed = JSON.parse(res.data?.slider_images || '[]');
        setSlides(Array.isArray(parsed) ? parsed : []);
      } catch {
        setSlides([]);
      }
    } catch (e) {
      console.warn('admin slider load failed', e);
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

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={styles.card}>
      <View style={styles.icon}>
        <MaterialIcons
          name="layers"
          size={18}
          color={item.enabled === false ? COLORS.gray400 : COLORS.primary}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title || '(no title)'}
        </Text>
        <Text style={styles.url} numberOfLines={1}>
          {item.url}
        </Text>
        {item.link ? (
          <Text style={styles.link} numberOfLines={1}>
            Link: {item.link}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {item.enabled !== false ? (
          <View style={styles.onPill}>
            <Text style={styles.onText}>enabled</Text>
          </View>
        ) : (
          <View style={styles.offPill}>
            <Text style={styles.offText}>disabled</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Hero Slider"
        subtitle={interval ? `Interval ${(Number(interval) / 1000).toFixed(0)}s` : undefined}
      />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={slides}
          keyExtractor={(item, i) => `${i}`}
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
            <EmptyState title="No slides" message="Slider images will appear here." />
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  url: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 1,
  },
  link: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 1,
  },
  right: {
    marginLeft: SPACING.sm,
  },
  onPill: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  onText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.successText,
  },
  offPill: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.neutralText,
  },
});

export default AdminSliderScreen;

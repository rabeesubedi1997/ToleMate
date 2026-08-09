import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';
import ServiceCard, { Service } from '../../components/ServiceCard';
import AppImage from '../../components/AppImage';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Favorites'>;

const FAV_SERVICES = 'tolemate_favorites';
const FAV_VENDORS = 'tolemate_fav_vendors';

interface FavVendor {
  id: number;
  business_name: string;
  avatar?: string | null;
  rating?: string | number | null;
}

const FavoritesScreen: React.FC<Props> = ({ navigation }) => {
  const toast = useToast();
  const [tab, setTab] = useState<'services' | 'vendors'>('services');
  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<FavVendor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavs = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getMany([FAV_SERVICES, FAV_VENDORS]);
      const serviceIds: number[] = stored[FAV_SERVICES] ? JSON.parse(stored[FAV_SERVICES]) : [];
      const vendorIds: number[] = stored[FAV_VENDORS] ? JSON.parse(stored[FAV_VENDORS]) : [];

      const serviceResults = await Promise.allSettled(
        serviceIds.map(id => api.get(`/services/${id}`)),
      );
      const vendorResults = await Promise.allSettled(
        vendorIds.map(id => api.get(`/vendors/${id}`)),
      );

      setServices(
        serviceResults
          .filter(r => r.status === 'fulfilled')
          .map((r: any) => r.value.data.service),
      );
      setVendors(
        vendorResults
          .filter(r => r.status === 'fulfilled')
          .map((r: any) => r.value.data.vendor),
      );
    } catch (e) {
      console.warn('favorites load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavs();
    }, [loadFavs]),
  );

  const removeFav = useCallback(
    async (id: number, isService: boolean) => {
      const key = isService ? FAV_SERVICES : FAV_VENDORS;
      const raw = await AsyncStorage.getItem(key);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(key, JSON.stringify(ids.filter(x => x !== id)));
      if (isService) {
        setServices(prev => prev.filter(s => s.id !== id));
      } else {
        setVendors(prev => prev.filter(v => v.id !== id));
      }
      toast.info('Removed from favorites');
    },
    [toast],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={22} color={COLORS.gray900} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.kicker}>Saved for later</Text>
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsRow}>
        {(['services', 'vendors'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'services' ? 'Services' : 'Vendors'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      ) : tab === 'services' ? (
        <FlatList
          data={services}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="No favorite services"
              message="Tap the heart on a service to save it here."
            />
          }
          renderItem={({ item }) => (
            <View>
              <ServiceCard
                service={item}
                onPress={s =>
                  navigation.navigate('ServiceDetail', { id: s.id })
                }
              />
              <TouchableOpacity
                style={styles.removeBtn}
                activeOpacity={0.8}
                onPress={() => removeFav(item.id, true)}
              >
                <MaterialIcons name="heart-broken" size={14} color={COLORS.rose} />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="No favorite vendors"
              message="Tap the heart on a vendor profile to save it here."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.vendorCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('VendorPublic', { id: item.id })
              }
            >
              <AppImage uri={item.avatar} style={styles.vendorAvatar} />
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{item.business_name}</Text>
                <Text style={styles.vendorRating}>
                  ★ {item.rating ? Number(item.rating).toFixed(1) : 'New'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeIcon}
                onPress={() => removeFav(item.id, false)}
              >
                <MaterialIcons name="heart-broken" size={18} color={COLORS.rose} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.light,
  },
  backBtn: {
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  kicker: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  headerSpacer: {
    width: 42,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm + 1,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
    ...SHADOW.card,
  },
  tabText: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  tabTextActive: {
    color: COLORS.primary700,
    fontWeight: '700',
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  listContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginLeft: SPACING.md + SPACING.xs,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.roseBg,
  },
  removeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.rose,
    fontWeight: '600',
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm,
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
  removeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FavoritesScreen;
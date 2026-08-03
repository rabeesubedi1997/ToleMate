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
import { COLORS, SPACING } from '../../theme';
import ServiceCard, { Service } from '../../components/ServiceCard';
import AppImage from '../../components/AppImage';
import EmptyState from '../../components/EmptyState';
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
    },
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={{ width: 24 }} />
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
          ListEmptyComponent={
            <EmptyState
              title="No favorite vendors"
              message="Tap the heart on a vendor profile to save it here."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.vendorRow}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('VendorPublic', { id: item.id })
              }
            >
              <AppImage uri={item.avatar} style={styles.vendorAvatar} />
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={styles.vendorName}>{item.business_name}</Text>
                <Text style={styles.vendorRating}>
                  ★ {item.rating ? Number(item.rating).toFixed(1) : 'New'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeFav(item.id, false)}>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.gray200,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.white,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate600,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    marginBottom: SPACING.md,
  },
  removeText: {
    fontSize: 12,
    color: COLORS.rose,
    fontWeight: '600',
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  vendorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
});

export default FavoritesScreen;

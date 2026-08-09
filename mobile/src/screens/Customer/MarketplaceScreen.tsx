import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../../theme';
import ServiceCard, { Service } from '../../components/ServiceCard';
import EmptyState from '../../components/EmptyState';
import { ServiceGridSkeleton } from '../../components/Skeleton';
import {
  CustomerTabParamList,
  MainStackParamList,
} from '../../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabScreenProps<CustomerTabParamList, 'Marketplace'>['navigation'],
  NativeStackNavigationProp<MainStackParamList>
>;

interface Category {
  id: number;
  name: string;
}

const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<CustomerTabParamList, 'Marketplace'>>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [total, setTotal] = useState(0);

  // Sync params coming from the Home screen (category / search deep-links)
  useEffect(() => {
    const catId = route.params?.categoryId;
    const q = route.params?.search;
    if (catId !== undefined) setCategoryId(catId);
    if (q !== undefined) {
      setSearch(q);
      fetchServices(1, catId ?? categoryId, q || undefined, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.categoryId, route.params?.search]);

  useFocusEffect(
    useCallback(() => {
      api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
      return () => {};
    }, []),
  );

  const fetchServices = useCallback(
    async (pageNum: number, catId?: number, query?: string, reset = false) => {
      try {
        const res: any = await api.get('/services', {
          params: {
            page: pageNum,
            per_page: 10,
            category_id: catId,
            search: query,
          },
        });
        const items = Array.isArray(res.data) ? res.data : res.data.data;
        const current = res.data.current_page ?? pageNum;
        const last = res.data.last_page ?? 1;
        setServices(prev =>
          reset || current === 1 ? items : [...prev, ...items],
        );
        setTotal(res.data.total ?? items.length);
        setPage(current);
        setHasMore(current < last);
        setFromCache(res.source === 'cache');
      } catch (e) {
        console.warn('marketplace load failed', e);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchServices(1, categoryId, search || undefined, true).finally(() =>
        setLoading(false),
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchServices, categoryId]),
  );

  const onEndReached = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    fetchServices(page + 1, categoryId, search || undefined).finally(() =>
      setLoadingMore(false),
    );
  }, [hasMore, loading, loadingMore, page, categoryId, search, fetchServices]);

  const submitSearch = useCallback(
    (query: string) => {
      setSearch(query);
      setLoading(true);
      fetchServices(1, categoryId, query || undefined, true).finally(() =>
        setLoading(false),
      );
    },
    [categoryId, fetchServices],
  );

  const clearAllFilters = useCallback(() => {
    setCategoryId(undefined);
    setSearch('');
    setLoading(true);
    fetchServices(1, undefined, undefined, true).finally(() => setLoading(false));
  }, [fetchServices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices(1, categoryId, search || undefined, true).finally(() =>
      setRefreshing(false),
    );
  }, [categoryId, search, fetchServices]);

  const toggleCategory = useCallback(
    (id: number) => {
      setCategoryId(prev => (prev === id ? undefined : id));
    },
    [],
  );

  const activeCategory = categories.find(c => c.id === categoryId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>Find pros near you</Text>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Browse Services</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <View style={styles.headerCountPill}>
              <Text style={styles.headerCount}>
                {total > 0 ? `${total} service${total !== 1 ? 's' : ''}` : ''}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSub}>
          {activeCategory
            ? `Showing services in “${activeCategory.name}”`
            : 'Find trusted professionals near you'}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.gray400} />
        <TextInput
          placeholder="Search services..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={() => submitSearch(search)}
          placeholderTextColor={COLORS.gray400}
        />
        {search.length > 0 ? (
          <TouchableOpacity
            style={styles.searchClear}
            onPress={() => submitSearch('')}
          >
            <MaterialIcons name="close" size={18} color={COLORS.gray500} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category filter chips */}
      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <TouchableOpacity
            style={[styles.chip, categoryId === undefined && styles.chipActive]}
            activeOpacity={0.8}
            onPress={() => setCategoryId(undefined)}
          >
            <MaterialIcons
              name="apps"
              size={14}
              color={categoryId === undefined ? COLORS.white : COLORS.gray500}
            />
            <Text
              style={[
                styles.chipText,
                categoryId === undefined && styles.chipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map(item => {
            const active = categoryId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
                onPress={() => toggleCategory(item.id)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active filter hint / clear */}
      {(categoryId !== undefined || search.length > 0) && (
        <View style={styles.activeRow}>
          <Text style={styles.activeText}>
            {activeCategory ? activeCategory.name : 'Search'} filter active
          </Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Offline notice */}
      {fromCache ? (
        <View style={styles.offlineRow}>
          <MaterialIcons name="cloud-off" size={13} color={COLORS.warningText} />
          <Text style={styles.offlineText}>
            Offline — showing saved results. Pull to retry.
          </Text>
        </View>
      ) : null}

      {/* Results */}
      <FlatList
        data={services}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          loading && services.length === 0 ? (
            <ServiceGridSkeleton count={6} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title={
                categoryId !== undefined || search.length > 0
                  ? 'No matching services'
                  : 'No services found'
              }
              message={
                categoryId !== undefined || search.length > 0
                  ? 'Try a different category or search term.'
                  : 'Try a different search or category.'
              }
            />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={COLORS.primary} style={styles.footer} />
          ) : null
        }
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            onPress={service =>
              navigation.navigate('ServiceDetail', { id: service.id })
            }
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.light,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  kicker: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  headerCountPill: {
    backgroundColor: COLORS.primary50,
    borderWidth: 1,
    borderColor: COLORS.primary100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
  },
  headerCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  headerSub: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray900,
    paddingVertical: 0,
  },
  searchClear: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: {
    marginTop: SPACING.md,
  },
  chips: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray700,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: COLORS.primary50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary100,
  },
  activeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  clearText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingVertical: 5,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.sm,
  },
  offlineText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.warningText,
  },
  loader: {
    marginVertical: SPACING.xl,
  },
  footer: {
    marginVertical: SPACING.md,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  listContent: {
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
});

export default MarketplaceScreen;
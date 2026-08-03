import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import { COLORS, SPACING } from '../../theme';
import ServiceCard, { Service } from '../../components/ServiceCard';
import EmptyState from '../../components/EmptyState';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
      return () => {};
    }, []),
  );

  const fetchServices = useCallback(
    async (pageNum: number, catId?: number, query?: string) => {
      try {
        const res = await api.get('/services', {
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
          current === 1 ? items : [...prev, ...items],
        );
        setPage(current);
        setHasMore(current < last);
      } catch (e) {
        console.warn('marketplace load failed', e);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchServices(1, categoryId, search || undefined).finally(() =>
        setLoading(false),
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchServices, categoryId]),
  );

  const onEndReached = useCallback(() => {
    if (!hasMore || loading || loadingMore) {
      return;
    }
    setLoadingMore(true);
    fetchServices(page + 1, categoryId, search || undefined).finally(() =>
      setLoadingMore(false),
    );
  }, [hasMore, loading, loadingMore, page, categoryId, search, fetchServices]);

  const submitSearch = useCallback(
    (query: string) => {
      setSearch(query);
      setLoading(true);
      fetchServices(1, categoryId, query || undefined).finally(() =>
        setLoading(false),
      );
    },
    [categoryId, fetchServices],
  );

  const toggleCategory = useCallback((id: number) => {
    setCategoryId(prev => {
      const next = prev === id ? undefined : id;
      setLoading(true);
      fetchServices(1, next, search || undefined).finally(() =>
        setLoading(false),
      );
      return next;
    });
  }, [search, fetchServices]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.slate500} />
        <TextInput
          placeholder="Search services..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={() => submitSearch(search)}
          placeholderTextColor={COLORS.slate400}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => submitSearch('')}>
            <MaterialIcons name="close" size={18} color={COLORS.slate500} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.chips}
        nestedScrollEnabled
        renderItem={({ item }) => {
          const active = categoryId === item.id;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleCategory(item.id)}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

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
        ListHeaderComponent={
          loading ? (
            <ActivityIndicator
              style={styles.loader}
              size="large"
              color={COLORS.primary}
            />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No services found"
              message="Try a different search or category."
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
            onPress={service => navigation.navigate('ServiceDetail', { id: service.id })}
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    height: 44,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 15,
    color: COLORS.dark,
    paddingVertical: 0,
  },
  chips: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.slate600,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
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
  },
});

export default MarketplaceScreen;

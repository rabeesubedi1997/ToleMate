import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING } from '../../theme';
import ServiceCard, { Service } from '../../components/ServiceCard';
import AppImage from '../../components/AppImage';
import AppBanner from '../../components/AppBanner';
import {
  CategoryRowSkeleton,
  ServiceGridSkeleton,
} from '../../components/Skeleton';
import { CustomerTabParamList, MainStackParamList } from '../../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<CustomerTabParamList, 'Home'>,
  NativeStackNavigationProp<MainStackParamList>
>;

interface Category {
  id: number;
  name: string;
  services_count?: number;
}

interface Vendor {
  id: number;
  business_name: string;
  avatar?: string | null;
  rating?: string | number | null;
  is_verified?: boolean;
  user?: { id: number; name?: string } | null;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    try {
      const [catRes, vendorRes, serviceRes]: any[] = await Promise.all([
        api.get('/categories'),
        api.get('/featured-vendors'),
        api.get('/services', { params: { per_page: 8 } }),
      ]);
      setCategories(catRes.data);
      setVendors(vendorRes.data);
      const svc = Array.isArray(serviceRes.data)
        ? serviceRes.data
        : serviceRes.data.data ?? [];
      setServices(svc);
      setFromCache(
        catRes.source === 'cache' ||
          vendorRes.source === 'cache' ||
          serviceRes.source === 'cache',
      );
    } catch (e) {
      console.warn('home load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const openSearch = useCallback(() => {
    navigation.navigate('Marketplace', { search: search.trim() || undefined });
  }, [navigation, search]);

  const openCategory = useCallback(
    (id: number) => navigation.navigate('Marketplace', { categoryId: id }),
    [navigation],
  );

  const openService = useCallback(
    (service: Service) =>
      navigation.navigate('ServiceDetail', { id: service.id }),
    [navigation],
  );

  const openVendor = useCallback(
    (id: number) => navigation.navigate('VendorPublic', { id }),
    [navigation],
  );

  // Banner/tile links come from CMS as web-style paths, map them to app routes
  const openBannerLink = useCallback(
    (link: string) => {
      const qsIndex = link.indexOf('?');
      const path = (qsIndex >= 0 ? link.slice(0, qsIndex) : link) || '/';
      const query = qsIndex >= 0 ? link.slice(qsIndex + 1) : '';
      const findBy = (key: string) => {
        const m = query.match(new RegExp(`(?:^|[&])${key}\\s*\\=\\s*([^&]+)`));
        return m ? decodeURIComponent(m[1]) : undefined;
      };

      const serviceMatch = path.match(/^\/services\/(\d+)/);
      if (serviceMatch) {
        navigation.navigate('ServiceDetail', { id: Number(serviceMatch[1]) });
        return;
      }
      const vendorMatch = path.match(/^\/vendors\/(\d+)/);
      if (vendorMatch) {
        navigation.navigate('VendorPublic', { id: Number(vendorMatch[1]) });
        return;
      }
      if (path === '/marketplace') {
        navigation.navigate('Marketplace', undefined);
        return;
      }

      const categoryId = findBy('category') ?? findBy('category_id');
      const bannerSearch = findBy('search');
      navigation.navigate(
        'Marketplace',
        categoryId
          ? { categoryId: Number(categoryId) }
          : bannerSearch
            ? { search: bannerSearch }
            : undefined,
      );
    },
    [navigation],
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      activeOpacity={0.8}
      onPress={() => openCategory(item.id)}
    >
      <View style={styles.categoryIcon}>
        <MaterialIcons name="category" size={22} color={COLORS.primary} />
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderVendor = ({ item }: { item: Vendor }) => (
    <TouchableOpacity
      style={styles.vendorCard}
      activeOpacity={0.85}
      onPress={() => openVendor(item.id)}
    >
      <AppImage uri={item.avatar} style={styles.vendorAvatar} />
      <Text style={styles.vendorName} numberOfLines={1}>
        {item.business_name}
      </Text>
      <Text style={styles.vendorRating}>
        ★ {item.rating ? Number(item.rating).toFixed(1) : 'New'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ToleMate</Text>
            <Text style={styles.greeting}>
              Namaste, {user?.name?.split(' ')[0] ?? 'Guest'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerBadge}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialIcons name="notifications-none" size={22} color={COLORS.primary} />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>

        {/* Hero banner */}
        <AppBanner onPressSlide={openBannerLink} />

        {fromCache ? (
          <View style={styles.offlineRow}>
            <MaterialIcons name="cloud-off" size={13} color={COLORS.warningText} />
            <Text style={styles.offlineText}>
              Offline — showing saved results. Pull to retry.
            </Text>
          </View>
        ) : null}

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={COLORS.slate500} />
          <TextInput
            placeholder="What service do you need?"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={openSearch}
            placeholderTextColor={COLORS.slate400}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={openSearch}>
              <Text style={styles.searchGo}>Go</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Post a request */}
        <TouchableOpacity
          style={styles.postReq}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PostRequest')}
        >
          <View style={styles.postReqIcon}>
            <MaterialIcons name="campaign" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.postReqBody}>
            <Text style={styles.postReqTitle}>Need something special?</Text>
            <Text style={styles.postReqSub}>Post a request and let vendors quote</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {loading ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            <CategoryRowSkeleton />
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Popular Services</Text>
            </View>
            <ServiceGridSkeleton count={4} />
          </>
        ) : (
          <>
            {/* Categories */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Marketplace', undefined)}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={item => String(item.id)}
              renderItem={renderCategory}
              contentContainerStyle={styles.categoryList}
              nestedScrollEnabled
            />

            {/* Featured vendors */}
            {vendors.length > 0 ? (
              <>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Featured Professionals</Text>
                </View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={vendors}
                  keyExtractor={item => String(item.id)}
                  renderItem={renderVendor}
                  contentContainerStyle={styles.vendorList}
                  nestedScrollEnabled
                />
              </>
            ) : null}

            {/* Services */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Popular Services</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Marketplace', undefined)}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              {services.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onPress={openService}
                />
              ))}
            </View>
            {services.length === 0 ? (
              <Text style={styles.emptyText}>
                No services available yet — be the first to book!
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.slate500,
    marginTop: 1,
    fontWeight: '600',
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.rose,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    height: 46,
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
  },
  postReq: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary100,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  postReqIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postReqBody: {
    flex: 1,
  },
  postReqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  postReqSub: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 1,
  },
  searchGo: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  loader: {
    marginTop: SPACING.xxl,
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
    borderRadius: 6,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.warningText,
  },
  sectionHead: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  categoryList: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryItem: {
    width: 86,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
  },
  vendorList: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  vendorCard: {
    width: 110,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  vendorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  vendorName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
  },
  vendorRating: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.slate500,
    padding: SPACING.xl,
    fontSize: 14,
  },
});

export default HomeScreen;

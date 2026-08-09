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
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';
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
      <MaterialIcons name="category" size={16} color={COLORS.gray700} />
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
      {/* Fixed header */}
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
          <MaterialIcons name="search" size={20} color={COLORS.gray400} />
          <TextInput
            placeholder="What service do you need?"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={openSearch}
            placeholderTextColor={COLORS.gray400}
          />
          {search.length > 0 ? (
            <TouchableOpacity style={styles.searchGo} onPress={openSearch}>
              <Text style={styles.searchGoText}>Go</Text>
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
              <View>
                <Text style={styles.kicker}>Explore</Text>
                <Text style={styles.sectionTitle}>Categories</Text>
              </View>
            </View>
            <CategoryRowSkeleton />
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.kicker}>Trending</Text>
                <Text style={styles.sectionTitle}>Popular Services</Text>
              </View>
            </View>
            <ServiceGridSkeleton count={4} />
          </>
        ) : (
          <>
            {/* Categories */}
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.kicker}>Explore</Text>
                <Text style={styles.sectionTitle}>Categories</Text>
              </View>
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
                  <View>
                    <Text style={styles.kicker}>Top rated</Text>
                    <Text style={styles.sectionTitle}>Featured Professionals</Text>
                  </View>
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
              <View>
                <Text style={styles.kicker}>Trending</Text>
                <Text style={styles.sectionTitle}>Popular Services</Text>
              </View>
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
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.light,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greeting: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray500,
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
    borderWidth: 1,
    borderColor: COLORS.gray100,
    ...SHADOW.card,
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
  },
  searchGo: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchGoText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.sm,
  },
  postReq: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  postReqIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary100,
  },
  postReqBody: {
    flex: 1,
  },
  postReqTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  postReqSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    marginTop: 1,
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
    borderRadius: RADIUS.sm,
  },
  offlineText: {
    fontSize: FONT_SIZE.xs,
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
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  kicker: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: 2,
  },
  categoryList: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  categoryName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.gray700,
    maxWidth: 96,
  },
  vendorList: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  vendorCard: {
    width: 112,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.sm + 4,
    ...SHADOW.card,
  },
  vendorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  vendorName: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray900,
    textAlign: 'center',
  },
  vendorRating: {
    marginTop: 2,
    fontSize: FONT_SIZE.xs,
    color: COLORS.accent,
    fontWeight: '700',
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
    color: COLORS.gray500,
    padding: SPACING.xl,
    fontSize: FONT_SIZE.base,
  },
});

export default HomeScreen;
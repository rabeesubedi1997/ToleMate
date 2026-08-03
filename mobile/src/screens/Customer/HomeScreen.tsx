import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
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

  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, vendorRes, serviceRes] = await Promise.all([
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
      } catch (e) {
        console.warn('home load failed', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Namaste,</Text>
            <Text style={styles.userName}>
              {user?.name?.split(' ')[0] ?? 'Guest'}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <MaterialIcons name="handyman" size={22} color={COLORS.primary} />
          </View>
        </View>

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

        {loading ? (
          <ActivityIndicator
            style={styles.loader}
            size="large"
            color={COLORS.primary}
          />
        ) : (
          <>
            {/* Categories */}
            <Text style={styles.sectionTitle}>Categories</Text>
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
                <Text style={styles.sectionTitle}>Featured Professionals</Text>
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
            <Text style={styles.sectionTitle}>Popular Services</Text>
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
  greeting: {
    fontSize: 14,
    color: COLORS.slate500,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
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
    paddingVertical: 0,
  },
  searchGo: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  sectionTitle: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.md,
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

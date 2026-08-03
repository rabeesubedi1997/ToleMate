import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW, FONT_SIZE } from '../../theme';

interface AdminVendor {
  id: number;
  business_name: string;
  description?: string | null;
  rating: string | number;
  is_verified: boolean;
  services_count?: number;
  subscription_plan?: string | null;
  user?: { name?: string; email?: string } | null;
}

const AdminVendorsScreen: React.FC = () => {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/vendors', { params: { per_page: 100 } });
      setVendors(res.data.data ?? res.data);
    } catch (e) {
      console.warn('admin vendors load failed', e);
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

  const filtered = vendors.filter(v => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.business_name.toLowerCase().includes(q) ||
      (v.user?.name ?? '').toLowerCase().includes(q)
    );
  });

  const renderVendor = ({ item }: { item: AdminVendor }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <MaterialIcons name="storefront" size={18} color={COLORS.infoText} />
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.business_name}
          </Text>
          {item.is_verified ? (
            <MaterialIcons
              name="verified"
              size={14}
              color={COLORS.primary}
              style={styles.verified}
            />
          ) : null}
        </View>
        <Text style={styles.owner} numberOfLines={1}>
          {item.user?.name ?? '—'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>★ {Number(item.rating).toFixed(1)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{item.services_count ?? 0} services</Text>
          {item.subscription_plan ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>{item.subscription_plan}</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendors</Text>
        <Text style={styles.count}>{vendors.length} total</Text>
      </View>

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color={COLORS.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search business or owner..."
          placeholderTextColor={COLORS.gray400}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={COLORS.gray400} />
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
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderVendor}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
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
            <EmptyState
              title="No vendors found"
              message="Try a different search or refresh."
            />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  count: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.gray900,
    paddingVertical: 0,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
    flexShrink: 1,
  },
  verified: {
    marginLeft: 4,
  },
  owner: {
    marginTop: 1,
    fontSize: 12,
    color: COLORS.gray500,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 11,
    color: COLORS.gray300,
    marginHorizontal: 4,
  },
});

export default AdminVendorsScreen;

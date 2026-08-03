import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import RoleBadge from '../../components/RoleBadge';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW, FONT_SIZE } from '../../theme';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

const AdminUsersScreen: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/users', { params: { per_page: 100 } });
      setUsers(res.data.data ?? res.data);
    } catch (e) {
      console.warn('admin users load failed', e);
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

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const renderUser = ({ item }: { item: AdminUser }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name
            .split(' ')
            .map(p => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {item.email}
        </Text>
      </View>
      <View style={styles.right}>
        <RoleBadge role={item.role} />
        <View style={styles.activeRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: item.is_active ? COLORS.successText : COLORS.rose },
            ]}
          />
          <Text style={styles.activeText}>
            {item.is_active ? 'active' : 'inactive'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.count}>{users.length} total</Text>
      </View>

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color={COLORS.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or email..."
          placeholderTextColor={COLORS.gray400}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <MaterialIcons
            name="close"
            size={18}
            color={COLORS.gray400}
            onPress={() => setSearch('')}
          />
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
          renderItem={renderUser}
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
              title="No users found"
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
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  body: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  email: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  right: {
    alignItems: 'flex-end',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  activeText: {
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: '600',
  },
});

export default AdminUsersScreen;

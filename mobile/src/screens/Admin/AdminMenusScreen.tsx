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

interface MenuItem {
  id: number;
  label: string;
  path: string;
  icon?: string | null;
  order: number;
  parent_id: number | null;
  is_active: boolean;
  role?: string | null;
  children?: MenuItem[];
}

const AdminMenusScreen: React.FC = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/menus');
      setMenus(res.data ?? []);
    } catch (e) {
      console.warn('admin menus load failed', e);
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

  const renderChildren = (children?: MenuItem[]) =>
    children && children.length > 0
      ? children.map(c => (
          <View key={c.id} style={styles.child}>
            <Text style={styles.childLabel}>{c.label}</Text>
            <View style={styles.right}>
              <Text style={styles.path}>{c.path}</Text>
              {c.is_active ? (
                <View style={styles.onPill}>
                  <Text style={styles.onText}>on</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))
      : null;

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialIcons name="list" size={16} color={COLORS.primary} />
        </View>
        <View style={styles.body}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.path} numberOfLines={1}>
            {item.path} · order {item.order}
          </Text>
        </View>
        <View style={styles.right}>
          {item.role ? (
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{item.role}</Text>
            </View>
          ) : null}
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.is_active ? COLORS.successText : COLORS.gray400 },
            ]}
          />
        </View>
      </View>
      {item.children ? renderChildren(item.children) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Menus" subtitle="Navigation menus shown on the site" />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={menus}
          keyExtractor={item => String(item.id)}
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
            <EmptyState title="No menus" message="Menus will appear here." />
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
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  body: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  path: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.neutralText,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  child: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    marginLeft: SPACING.md,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary200,
  },
  childLabel: {
    fontSize: 12,
    color: COLORS.gray700,
    fontWeight: '500',
    flex: 1,
  },
  onPill: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  onText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.successText,
  },
});

export default AdminMenusScreen;

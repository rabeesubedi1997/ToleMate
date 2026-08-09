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
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/EmptyState';
import AdminHeader from '../../components/AdminHeader';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface LogItem {
  id: number;
  action: string;
  created_at: string;
  user?: { name?: string } | null;
  subject_type?: string | null;
}

interface StatsActivity {
  type: string;
  text: string;
  time: string;
  status?: string;
}

const AdminActivityScreen: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<(LogItem | StatsActivity)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isSuperAdmin) {
        const res = await api.get('/super-admin/activity-logs', {
          params: { per_page: 50 },
        });
        setLogs(res.data.data ?? []);
      } else {
        const res = await api.get('/admin/stats');
        setLogs(res.data.recent_activity ?? []);
      }
    } catch (e) {
      console.warn('admin activity load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const actionLabel = (action: string) =>
    action
      .replace(/App\\Models\\/g, '')
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

  const renderItem = ({ item }: { item: LogItem | StatsActivity }) => {
    if ('action' in item) {
      return (
        <View style={styles.card}>
          <View style={styles.icon}>
            <MaterialIcons name="history" size={16} color={COLORS.primary700} />
          </View>
          <View style={styles.body}>
            <Text style={styles.text} numberOfLines={2}>
              {item.user?.name ?? 'System'} — {actionLabel(item.action)}
            </Text>
            <Text style={styles.time}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.card}>
        <View style={styles.icon}>
          <MaterialIcons name="event" size={16} color={COLORS.primary700} />
        </View>
        <View style={styles.body}>
          <Text style={styles.text} numberOfLines={2}>
            {item.text}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Activity Log" subtitle="Actions across the platform" />

      {isSuperAdmin ? (
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Super Admin</Text>
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, i) =>
            String('id' in item ? item.id : i)
          }
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
            <EmptyState
              title="No activity yet"
              message="Actions across the platform will appear here."
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
  pillRow: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  pill: {
    backgroundColor: COLORS.primary100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pillText: {
    color: COLORS.primary700,
    fontSize: 11,
    fontWeight: '700',
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: 12,
    ...SHADOW.card,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    color: COLORS.gray600,
    fontWeight: '500',
    lineHeight: 18,
  },
  time: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.gray400,
    fontWeight: '500',
  },
});

export default AdminActivityScreen;
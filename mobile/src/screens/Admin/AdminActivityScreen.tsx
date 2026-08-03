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
import { COLORS, SPACING, RADIUS, SHADOW, FONT_SIZE } from '../../theme';

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
            <MaterialIcons name="history" size={16} color={COLORS.primary} />
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
          <MaterialIcons name="event" size={16} color={COLORS.primary} />
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
      <View style={styles.header}>
        <Text style={styles.title}>Activity Log</Text>
        {isSuperAdmin ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>Super Admin</Text>
          </View>
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
  pill: {
    backgroundColor: COLORS.primary50,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
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
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
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
  text: {
    fontSize: 13,
    color: COLORS.gray800,
    fontWeight: '500',
  },
  time: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.gray400,
  },
});

export default AdminActivityScreen;

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

interface Message {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: { id: number; name?: string; role?: string } | null;
  receiver?: { id: number; name?: string; role?: string } | null;
}

const AdminMessagesScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/conversations', {
        params: { per_page: 100 },
      });
      setMessages(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('admin messages load failed', e);
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

  const renderItem = ({ item }: { item: Message }) => (
    <View style={styles.card}>
      <View style={[styles.icon, !item.is_read && styles.iconUnread]}>
        <MaterialIcons
          name="forum"
          size={16}
          color={item.is_read ? COLORS.gray400 : COLORS.primary}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.sender} numberOfLines={1}>
            {item.sender?.name ?? '—'} → {item.receiver?.name ?? '—'}
          </Text>
          <Text style={styles.time}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Messages" subtitle="All conversations on the platform" />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={messages}
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
            <EmptyState title="No messages" message="Conversations will appear here." />
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
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  iconUnread: {
    backgroundColor: COLORS.primary50,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sender: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray800,
    marginRight: SPACING.sm,
  },
  time: {
    fontSize: 10,
    color: COLORS.gray400,
  },
  message: {
    fontSize: 13,
    color: COLORS.gray600,
    marginTop: 3,
  },
});

export default AdminMessagesScreen;

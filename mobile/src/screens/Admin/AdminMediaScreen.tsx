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

interface MediaItem {
  id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  created_at: string;
}

const fmtSize = (bytes: number) =>
  bytes > 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : bytes > 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${bytes} B`;

const AdminMediaScreen: React.FC = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/media', { params: { per_page: 100 } });
      setMedia(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('admin media load failed', e);
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

  const renderItem = ({ item }: { item: MediaItem }) => (
    <View style={styles.card}>
      <View style={styles.icon}>
        <MaterialIcons name="image" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.file_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.mime_type} · {fmtSize(item.size)}
        </Text>
        <Text style={styles.path} numberOfLines={1}>
          {item.file_path}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Media Library" subtitle="Uploaded files" />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={media}
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
            <EmptyState title="No media" message="Uploads will appear here." />
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
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  body: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 1,
  },
  path: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 1,
  },
});

export default AdminMediaScreen;

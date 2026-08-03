import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
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

const mediaUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  return `${api.defaults.baseURL?.replace(/\/api\/?$/, '')}${path}`;
};

const AdminMediaScreen: React.FC = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const pickAndUpload = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `photo_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
      } as any);
      await api.post('/admin/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
      Alert.alert('Uploaded', 'Image added to the media library.');
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const remove = (item: MediaItem) => {
    Alert.alert('Delete asset', `Delete "${item.file_name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/media/${item.id}`);
            load();
          } catch (e: any) {
            Alert.alert('Failed', e?.response?.data?.message ?? 'Could not delete asset.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: MediaItem }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: mediaUrl(item.file_path) }}
        style={styles.thumb}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.file_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.mime_type} · {fmtSize(item.size)}
        </Text>
      </View>
      <Pressable
        onPress={() => remove(item)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={styles.deleteBtn}
      >
        <MaterialIcons name="delete-outline" size={20} color={COLORS.rose} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Media Library" subtitle="Images used across the site" />
      <Pressable
        style={[styles.addBtn, uploading && styles.btnDisabled]}
        onPress={pickAndUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <MaterialIcons name="add-photo-alternate" size={18} color={COLORS.white} />
        )}
        <Text style={styles.addBtnText}>
          {uploading ? 'Uploading...' : 'Upload Image'}
        </Text>
      </Pressable>

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
            <EmptyState
              title="No media"
              message="Upload your first image to get started."
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
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
  thumb: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.gray100,
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
  deleteBtn: {
    padding: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdminMediaScreen;

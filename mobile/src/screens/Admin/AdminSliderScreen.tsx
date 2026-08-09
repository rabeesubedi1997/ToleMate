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
  TextInput,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Slide {
  url: string;
  title?: string;
  link?: string;
  enabled?: boolean;
}

const mediaUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  return `${api.defaults.baseURL?.replace(/\/api\/?$/, '')}${path}`;
};

const apiBase = () =>
  (api.defaults.baseURL ?? '').replace(/\/api\/?$/, '').replace(/\/$/, '');

/**
 * Resolve stored slide image URLs so they always point at the host
 * this app talks to. Fixes dev machines saving `localhost:8000/storage/...`
 * or `10.0.2.2/...` paths that cannot load on a phone.
 */
const resolveImageUrl = (raw: string): string => {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    const m = url.match(
      /^(https?:\/\/)(localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0)(:\d+)?(\/.*)?$/i,
    );
    if (m) {
      return `${apiBase()}${m[4] ?? ''}`;
    }
    return url;
  }
  return mediaUrl(url.startsWith('/') ? url : `/${url}`);
};

const normalizeSlides = (raw: unknown): Slide[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is Record<string, unknown> =>
        !!s && typeof s === 'object' && typeof (s as any).url === 'string' && !!(s as any).url,
    )
    .map(s => ({
      url: s.url as string,
      title: typeof s.title === 'string' ? s.title : undefined,
      link: typeof s.link === 'string' ? s.link : undefined,
      enabled: (s as any).enabled !== false,
    }));
};

const DEFAULT_SLIDES = [
  { url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80', title: 'Professional Home Repair Services', link: '/services', enabled: true },
  { url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&q=80', title: 'Trusted Cleaning Professionals', link: '/services', enabled: true },
  { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80', title: 'Expert Tech Support at Your Door', link: '/services', enabled: true },
  { url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80', title: 'Perfect Events, Every Time', link: '/services', enabled: true },
];

const SlideThumb: React.FC<{ item: Slide }> = ({ item }) => {
  const [failed, setFailed] = useState(false);

  if (!item.url || failed) {
    return (
      <View style={[styles.thumb, styles.thumbFailed]}>
        <MaterialIcons name="broken-image" size={18} color={COLORS.gray400} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: resolveImageUrl(item.url) }}
      style={[styles.thumb, item.enabled === false && styles.thumbOff]}
      onError={() => setFailed(true)}
    />
  );
};

const AdminSliderScreen: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [interval, setIntervalMs] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', link: '', enabled: true });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      setIntervalMs(res.data?.slider_interval ?? '');
      try {
        const parsed = JSON.parse(res.data?.slider_images || '[]');
        setSlides(normalizeSlides(parsed));
      } catch {
        setSlides([]);
      }
    } catch (e) {
      console.warn('admin slider load failed', e);
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

  const saveSlides = async (next: Slide[]) => {
    setSaving(true);
    try {
      await api.post('/admin/settings', {
        settings: [
          { key: 'slider_images', value: JSON.stringify(next) },
        ],
      });
      setSlides(next);
    } catch {
      Alert.alert('Failed', 'Could not save slider.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (idx: number) => {
    setEditing(idx);
    const s = slides[idx];
    setForm({
      title: s.title ?? '',
      link: s.link ?? '',
      enabled: s.enabled !== false,
    });
  };

  const saveEdit = async () => {
    if (editing === null) return;
    const next = slides.map((s, i) =>
      i === editing ? { ...s, title: form.title, link: form.link, enabled: form.enabled } : s,
    );
    setEditing(null);
    await saveSlides(next);
  };

  const toggleEnabled = (idx: number) => {
    const next = slides.map((s, i) =>
      i === idx ? { ...s, enabled: s.enabled === false } : s,
    );
    saveSlides(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= slides.length) return;
    const next = [...slides];
    [next[idx], next[to]] = [next[to], next[idx]];
    saveSlides(next);
  };

  const remove = (idx: number) => {
    Alert.alert('Remove slide', 'Remove this slide from the banner?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => saveSlides(slides.filter((_, i) => i !== idx)),
      },
    ]);
  };

  const loadDefaults = () => {
    Alert.alert(
      'Load defaults',
      'Replace the current slider with the 4 default images?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load', onPress: () => saveSlides(DEFAULT_SLIDES) },
      ],
    );
  };

  const pickAndAdd = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `slide_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
      } as any);
      const res = await api.post('/admin/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = res.data?.media;
      if (uploaded?.file_path) {
        await saveSlides([
          ...slides,
          {
            url: resolveImageUrl(uploaded.file_path),
            title: '',
            link: '/services',
            enabled: true,
          },
        ]);
        Alert.alert('Added', 'Slide added. Tap edit to set a title.');
      } else {
        Alert.alert('Failed', 'Upload did not return an image.');
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not upload image.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item, index }: { item: Slide; index: number }) => (
    <View style={styles.card}>
      <SlideThumb item={item} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title || '(no title)'}
        </Text>
        <Text style={styles.url} numberOfLines={1}>
          {item.url}
        </Text>
        {item.link ? (
          <Text style={styles.link} numberOfLines={1}>
            Link: {item.link}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => move(index, -1)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons name="arrow-upward" size={16} color={COLORS.gray600} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => move(index, 1)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons name="arrow-downward" size={16} color={COLORS.gray600} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => toggleEnabled(index)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons
            name={item.enabled !== false ? 'visibility' : 'visibility-off'}
            size={16}
            color={item.enabled !== false ? COLORS.primary : COLORS.gray400}
          />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => openEdit(index)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons name="edit" size={16} color={COLORS.primary700} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => remove(index)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons name="delete-outline" size={16} color={COLORS.rose} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Hero Slider"
        subtitle={interval ? `Interval ${(Number(interval) / 1000).toFixed(0)}s` : undefined}
      />

      <View style={styles.topRow}>
        <Pressable
          style={[styles.defaultsBtn, saving && styles.btnDisabled]}
          onPress={loadDefaults}
          disabled={saving}
        >
          <MaterialIcons name="bolt" size={16} color={COLORS.primary700} />
          <Text style={styles.defaultsBtnText}>Load defaults</Text>
        </Pressable>
        <Pressable
          style={[styles.uploadBtn, saving && styles.btnDisabled]}
          onPress={pickAndAdd}
          disabled={saving}
        >
          <MaterialIcons name="add-photo-alternate" size={16} color={COLORS.white} />
          <Text style={styles.uploadBtnText}>Add slide</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={slides}
          keyExtractor={(item, i) => `${i}`}
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
              title="No slides"
              message="Load defaults or manage slides from the web admin."
            />
          }
        />
      )}

      <Modal
        visible={editing !== null}
        title="Edit slide"
        onClose={() => setEditing(null)}
      >
        <Text style={styles.fieldLabel}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Slide title"
          placeholderTextColor={COLORS.gray400}
          value={form.title}
          onChangeText={t => setForm(f => ({ ...f, title: t }))}
        />
        <Text style={styles.fieldLabel}>Link (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="/services"
          placeholderTextColor={COLORS.gray400}
          value={form.link}
          onChangeText={t => setForm(f => ({ ...f, link: t }))}
          autoCapitalize="none"
        />
        <Pressable
          style={styles.enabledRow}
          onPress={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
        >
          <MaterialIcons
            name={form.enabled ? 'check-box' : 'check-box-outline-blank'}
            size={20}
            color={form.enabled ? COLORS.primary : COLORS.gray400}
          />
          <Text style={styles.enabledLabel}>Enabled</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={saveEdit}
          disabled={saving}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? 'Saving...' : 'Save slide'}
          </Text>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  defaultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary100,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  defaultsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
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
    width: 56,
    height: 42,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
  },
  thumbOff: {
    opacity: 0.4,
  },
  thumbFailed: {
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  url: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 1,
  },
  link: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    marginLeft: SPACING.sm,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 42,
    fontSize: 14,
    color: COLORS.gray900,
  },
  enabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  enabledLabel: {
    fontSize: 13,
    color: COLORS.gray700,
    marginLeft: 6,
    fontWeight: '500',
  },
  primaryBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdminSliderScreen;

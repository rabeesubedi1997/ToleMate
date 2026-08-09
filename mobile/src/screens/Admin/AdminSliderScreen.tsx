import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
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
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';

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
        <MaterialIcons name="broken-image" size={24} color={COLORS.gray400} />
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
  const toast = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [interval, setIntervalMs] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', link: '', enabled: true });
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    tone?: 'danger' | 'primary' | 'warning';
    confirmLabel?: string;
    icon?: string;
    fn: () => void;
  } | null>(null);

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
      toast.success('Slider saved.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not save slider.');
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
    saveSlides(slides.filter((_, i) => i !== idx));
  };

  const confirmRemove = (idx: number) =>
    setConfirm({
      title: 'Remove slide',
      message: 'Remove this slide from the banner?',
      confirmLabel: 'Remove',
      icon: 'delete-outline',
      tone: 'danger',
      fn: () => remove(idx),
    });

  const confirmLoadDefaults = () =>
    setConfirm({
      title: 'Load defaults',
      message: 'Replace the current slider with the 4 default images?',
      confirmLabel: 'Load',
      icon: 'bolt',
      tone: 'primary',
      fn: () => saveSlides(DEFAULT_SLIDES),
    });

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
        toast.success('Slide added. Tap edit to set a title.');
      } else {
        toast.error('Upload did not return an image.');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not upload image.');
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
          style={[styles.iconBtn, styles.actionMuted]}
          onPress={() => move(index, -1)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="arrow-upward" size={18} color={COLORS.gray600} />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, styles.actionMuted]}
          onPress={() => move(index, 1)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="arrow-downward" size={18} color={COLORS.gray600} />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, item.enabled !== false ? styles.actionToggle : styles.actionMuted]}
          onPress={() => toggleEnabled(index)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons
            name={item.enabled !== false ? 'visibility' : 'visibility-off'}
            size={18}
            color={item.enabled !== false ? COLORS.primary700 : COLORS.gray400}
          />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, styles.actionEdit]}
          onPress={() => openEdit(index)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="edit" size={18} color={COLORS.primary700} />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, styles.actionDelete]}
          onPress={() => confirmRemove(index)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
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
          style={[styles.ghostBtn, saving && styles.btnDisabled]}
          onPress={confirmLoadDefaults}
          disabled={saving}
        >
          <MaterialIcons name="bolt" size={16} color={COLORS.gray700} />
          <Text style={styles.ghostBtnText}>Load defaults</Text>
        </Pressable>
        <Pressable
          style={[styles.addBtn, saving && styles.btnDisabled]}
          onPress={pickAndAdd}
          disabled={saving}
        >
          <MaterialIcons name="add-photo-alternate" size={18} color={COLORS.white} />
          <Text style={styles.addBtnText}>Add slide</Text>
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
        subtitle={editing !== null ? `Slide ${editing + 1}` : undefined}
        icon="edit"
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

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        tone={confirm?.tone}
        icon={confirm?.icon}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          c?.fn();
        }}
      />
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
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  ghostBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  ghostBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.gray700,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 46,
    ...SHADOW.card,
  },
  addBtnText: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.white,
  },
  loader: {
    marginTop: 60,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    paddingBottom: SPACING.xl + 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  thumb: {
    width: '100%',
    height: 120,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.gray100,
  },
  thumbOff: {
    opacity: 0.4,
  },
  thumbFailed: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  url: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 2,
  },
  link: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMuted: {
    backgroundColor: COLORS.gray100,
  },
  actionToggle: {
    backgroundColor: COLORS.primary100,
  },
  actionEdit: {
    backgroundColor: COLORS.primary100,
  },
  actionDelete: {
    backgroundColor: COLORS.roseBg,
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray600,
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 46,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray900,
  },
  enabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  enabledLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.gray700,
    marginLeft: 6,
    fontWeight: '500',
  },
  primaryBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdminSliderScreen;
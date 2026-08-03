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
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface PageSeo {
  id: number;
  page: string;
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  og_image?: string | null;
  no_index?: boolean;
}

const AdminPageSeoScreen: React.FC = () => {
  const [items, setItems] = useState<PageSeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<PageSeo | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    page: '',
    title: '',
    description: '',
    keywords: '',
    og_image: '',
    no_index: false,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/page-seo');
      setItems(res.data ?? []);
    } catch (e) {
      console.warn('page seo load failed', e);
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

  const openEdit = (item: PageSeo) => {
    setCreating(false);
    setEditing(item);
    setForm({
      page: item.page,
      title: item.title ?? '',
      description: item.description ?? '',
      keywords: item.keywords ?? '',
      og_image: item.og_image ?? '',
      no_index: !!item.no_index,
    });
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({
      page: '',
      title: '',
      description: '',
      keywords: '',
      og_image: '',
      no_index: false,
    });
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    const payload = {
      page: form.page.trim(),
      title: form.title,
      description: form.description,
      keywords: form.keywords,
      og_image: form.og_image,
      no_index: form.no_index,
    };
    if (!payload.page) {
      Alert.alert('Missing route', 'The page route is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/page-seo/${editing.id}`, payload);
      } else {
        await api.post('/admin/page-seo', payload);
      }
      closeModal();
      load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not save page SEO.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: PageSeo) => {
    Alert.alert('Delete page SEO', `Delete SEO entry for "${item.page}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/page-seo/${item.id}`);
            load();
          } catch (e: any) {
            Alert.alert(
              'Failed',
              e?.response?.data?.message ?? 'Could not delete page SEO.',
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: PageSeo }) => (
    <View style={styles.card}>
      <Pressable style={styles.cardBody} onPress={() => openEdit(item)}>
        <View style={styles.topRow}>
          <View style={styles.icon}>
            <MaterialIcons name="description" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.page} numberOfLines={1}>
            {item.page}
          </Text>
          {item.no_index ? (
            <View style={styles.noIndexPill}>
              <Text style={styles.noIndexText}>noindex</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {item.title || '(no title)'}
        </Text>
        <Text style={styles.desc} numberOfLines={2}>
          {item.description || '—'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.keywords || 'no keywords'}
        </Text>
      </Pressable>
      <Pressable
        style={styles.deleteBtn}
        onPress={() => remove(item)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Page SEO" subtitle="Meta settings per page" />
      <Pressable style={styles.addBtn} onPress={openCreate}>
        <MaterialIcons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Add Page</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={items}
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
            <EmptyState title="No page SEO" message="Page SEO entries will appear here." />
          }
        />
      )}

      <Modal
        visible={editing !== null || creating}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {creating ? 'New page SEO' : editing ? `SEO for ${editing.page}` : ''}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {creating ? (
                <>
                  <Text style={styles.label}>Page route *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.page}
                    onChangeText={v => setForm(p => ({ ...p, page: v }))}
                    placeholder="/services"
                    placeholderTextColor={COLORS.gray400}
                    autoCapitalize="none"
                  />
                </>
              ) : null}
              <Text style={styles.label}>Meta title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={v => setForm(p => ({ ...p, title: v }))}
                placeholderTextColor={COLORS.gray400}
              />
              <Text style={styles.label}>Meta description</Text>
              <TextInput
                style={[styles.input, styles.inputBig]}
                value={form.description}
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                placeholderTextColor={COLORS.gray400}
                multiline
              />
              <Text style={styles.label}>Keywords</Text>
              <TextInput
                style={styles.input}
                value={form.keywords}
                onChangeText={v => setForm(p => ({ ...p, keywords: v }))}
                placeholderTextColor={COLORS.gray400}
              />
              <Text style={styles.label}>OG image URL</Text>
              <TextInput
                style={styles.input}
                value={form.og_image}
                onChangeText={v => setForm(p => ({ ...p, og_image: v }))}
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.noIndexRow}
                onPress={() => setForm(p => ({ ...p, no_index: !p.no_index }))}
              >
                <MaterialIcons
                  name={form.no_index ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={form.no_index ? COLORS.primary : COLORS.gray400}
                />
                <Text style={styles.noIndexLabel}>No index (hide from search)</Text>
              </Pressable>
            </ScrollView>
            <View style={styles.modalRow}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={closeModal}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={save}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : creating ? 'Create' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    marginLeft: 4,
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
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  cardBody: {
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  page: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  noIndexPill: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  noIndexText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.warningText,
  },
  title: {
    fontSize: 12,
    color: COLORS.gray700,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  desc: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
  },
  meta: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 2,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modal: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray600,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 40,
    fontSize: 13,
    color: COLORS.gray900,
  },
  inputBig: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  noIndexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  noIndexLabel: {
    fontSize: 13,
    color: COLORS.gray700,
    marginLeft: 6,
    fontWeight: '500',
  },
  modalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.gray100,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    color: COLORS.gray700,
    fontWeight: '600',
    fontSize: 13,
  },
  saveText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default AdminPageSeoScreen;

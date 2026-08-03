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
  const [form, setForm] = useState({ title: '', description: '', keywords: '', og_image: '', no_index: false });
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
    setEditing(item);
    setForm({
      title: item.title ?? '',
      description: item.description ?? '',
      keywords: item.keywords ?? '',
      og_image: item.og_image ?? '',
      no_index: !!item.no_index,
    });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/admin/page-seo/${editing.id}`, {
        page: editing.page,
        title: form.title,
        description: form.description,
        keywords: form.keywords,
        og_image: form.og_image,
        no_index: form.no_index,
      });
      setEditing(null);
      load();
    } catch {
      Alert.alert('Failed', 'Could not save page SEO.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: PageSeo }) => (
    <Pressable style={styles.card} onPress={() => openEdit(item)}>
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
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Page SEO" subtitle="Meta settings per page" />

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
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editing ? `SEO for ${editing.page}` : ''}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
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
                onPress={() => setEditing(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={save}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
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
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
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

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  services_count: number;
}

const AdminCategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    tone?: 'danger' | 'primary' | 'warning';
    confirmLabel?: string;
    icon?: string;
    fn?: () => void;
  } | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data ?? []);
    } catch (e) {
      console.warn('admin categories load failed', e);
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

  const openCreate = () => {
    setEditing(null);
    setName('');
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/categories/${editing.id}`, { name: name.trim() });
      } else {
        await api.post('/admin/categories', { name: name.trim() });
      }
      setName('');
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not save category.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (cat: Category) => {
    setConfirm({
      title: 'Delete category',
      message: `Delete "${cat.name}"?`,
      tone: 'danger',
      confirmLabel: 'Delete',
      icon: 'delete-outline',
      fn: async () => {
        try {
          await api.delete(`/admin/categories/${cat.id}`);
          load();
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Could not delete category.');
        }
      },
    });
  };

  const renderItem = ({ item }: { item: Category }) => (
    <View style={styles.card}>
      <View style={styles.icon}>
        <MaterialIcons name="category" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{item.name}</Text>
        {item.parent_id ? <Text style={styles.meta}>Subcategory</Text> : null}
      </View>
      <View style={styles.actions}>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{item.services_count}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtnEdit}
          onPress={() => openEdit(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="edit" size={18} color={COLORS.primary700} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtnDelete}
          onPress={() => remove(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Categories" subtitle="Manage service categories" />

      <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
        <MaterialIcons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Add category</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          style={styles.flatList}
          data={categories}
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
            <EmptyState title="No categories" message="Add your first category." />
          }
        />
      )}

      <Modal
        visible={modalOpen}
        title={editing ? 'Rename category' : 'New Category'}
        icon="category"
        onClose={() => setModalOpen(false)}
      >
        <Text style={styles.fieldLabel}>Category name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Home Cleaning"
          placeholderTextColor={COLORS.gray400}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <View style={styles.modalRow}>
          <TouchableOpacity
            style={[styles.modalBtn, styles.cancelBtn]}
            onPress={() => setModalOpen(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalBtn, styles.saveBtn, saving && styles.btnDisabled]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.saveText}>
              {saving ? 'Saving...' : editing ? 'Save' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        icon={confirm?.icon}
        tone={confirm?.tone}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          c?.fn?.();
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 46,
    marginHorizontal: SPACING.md,
    marginBottom: 12,
    ...SHADOW.card,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  flatList: {
    flex: 1,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  body: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  meta: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray400,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  countPill: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.neutralText,
  },
  iconBtnEdit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray600,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 46,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray900,
  },
  modalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    color: COLORS.gray700,
    fontWeight: '700',
    fontSize: FONT_SIZE.base,
  },
  saveText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.base,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdminCategoriesScreen;
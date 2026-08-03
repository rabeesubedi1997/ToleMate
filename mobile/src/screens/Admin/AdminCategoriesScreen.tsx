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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

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
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

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

  const addCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.post('/admin/categories', { name: newName.trim() });
      setNewName('');
      setModalOpen(false);
      load();
    } catch (e) {
      console.warn('add category failed', e);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Category }) => (
    <View style={styles.card}>
      <View style={styles.icon}>
        <MaterialIcons name="category" size={18} color={COLORS.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{item.name}</Text>
        {item.parent_id ? (
          <Text style={styles.meta}>Subcategory</Text>
        ) : null}
      </View>
      <View style={styles.countPill}>
        <Text style={styles.countText}>{item.services_count} services</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Categories" subtitle="Manage service categories" />
      <Pressable style={styles.addBtn} onPress={() => setModalOpen(true)}>
        <MaterialIcons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Add Category</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
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
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TextInput
              style={styles.input}
              placeholder="Category name"
              placeholderTextColor={COLORS.gray400}
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
            />
            <View style={styles.modalRow}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={addCategory}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : 'Add'}
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
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  body: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray400,
  },
  countPill: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.neutralText,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modal: {
    width: '100%',
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
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 42,
    fontSize: 14,
    color: COLORS.gray900,
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

export default AdminCategoriesScreen;

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
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface MenuItem {
  id: number;
  label: string;
  path: string;
  icon?: string | null;
  order: number;
  parent_id: number | null;
  is_active: boolean;
  role?: string | null;
  children?: MenuItem[];
}

const ROLES = ['', 'guest', 'customer', 'vendor', 'admin'];

const emptyForm = {
  label: '',
  path: '',
  icon: '',
  order: '0',
  parent_id: '',
  is_active: true,
  role: '',
};

const AdminMenusScreen: React.FC = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/menus');
      setMenus(res.data ?? []);
    } catch (e) {
      console.warn('admin menus load failed', e);
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
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      label: item.label,
      path: item.path,
      icon: item.icon ?? '',
      order: String(item.order),
      parent_id: item.parent_id ? String(item.parent_id) : '',
      is_active: item.is_active,
      role: item.role ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.label.trim() || !form.path.trim()) {
      Alert.alert('Missing info', 'Label and path are required.');
      return;
    }
    setSaving(true);
    const payload = {
      label: form.label.trim(),
      path: form.path.trim(),
      icon: form.icon.trim() || null,
      order: parseInt(form.order, 10) || 0,
      parent_id: form.parent_id ? parseInt(form.parent_id, 10) : null,
      is_active: form.is_active,
      role: form.role || null,
    };
    try {
      if (editing) {
        await api.put(`/admin/menus/${editing.id}`, payload);
      } else {
        await api.post('/admin/menus', payload);
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not save menu.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: MenuItem) => {
    try {
      await api.put(`/admin/menus/${item.id}`, {
        ...item,
        is_active: !item.is_active,
      });
      load();
    } catch {
      Alert.alert('Failed', 'Could not toggle menu.');
    }
  };

  const remove = (item: MenuItem) => {
    Alert.alert('Delete menu', `Delete "${item.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/menus/${item.id}`);
            load();
          } catch (e: any) {
            Alert.alert('Failed', e?.response?.data?.message ?? 'Could not delete menu.');
          }
        },
      },
    ]);
  };

  const renderActions = (item: MenuItem, child = false) => (
    <View style={styles.actions}>
      <Pressable
        onPress={() => toggleActive(item)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <MaterialIcons
          name={item.is_active ? 'toggle-on' : 'toggle-off'}
          size={22}
          color={item.is_active ? COLORS.primary : COLORS.gray400}
        />
      </Pressable>
      <Pressable
        onPress={() => openEdit(item)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <MaterialIcons name="edit" size={18} color={COLORS.primary700} />
      </Pressable>
      {!child ? (
        <Pressable
          onPress={() => remove(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="delete-outline" size={18} color={COLORS.rose} />
        </Pressable>
      ) : null}
    </View>
  );

  const renderChildren = (children?: MenuItem[]) =>
    children && children.length > 0
      ? children.map(c => (
          <View key={c.id} style={styles.child}>
            <Text style={styles.childLabel} numberOfLines={1}>
              {c.label}
            </Text>
            <Text style={styles.childPath} numberOfLines={1}>
              {c.path}
            </Text>
            {renderActions(c, true)}
          </View>
        ))
      : null;

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialIcons name="list" size={16} color={COLORS.primary} />
        </View>
        <View style={styles.body}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.path} numberOfLines={1}>
            {item.path} · order {item.order}
          </Text>
        </View>
        {item.role ? (
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        ) : null}
        {renderActions(item)}
      </View>
      {item.children ? renderChildren(item.children) : null}
    </View>
  );

  const topLevel = menus.filter(m => !m.parent_id);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Menus" subtitle="Navigation menus shown on the site" />
      <Pressable style={styles.addBtn} onPress={openCreate}>
        <MaterialIcons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Add Menu Item</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={topLevel}
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
            <EmptyState title="No menus" message="Add your first menu item." />
          }
        />
      )}

      <Modal
        visible={modalOpen}
        title={editing ? `Edit "${editing.label}"` : 'New menu item'}
        onClose={() => setModalOpen(false)}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Label *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Services"
            placeholderTextColor={COLORS.gray400}
            value={form.label}
            onChangeText={t => setForm(f => ({ ...f, label: t }))}
          />
          <Text style={styles.fieldLabel}>Path *</Text>
          <TextInput
            style={styles.input}
            placeholder="/services"
            placeholderTextColor={COLORS.gray400}
            value={form.path}
            onChangeText={t => setForm(f => ({ ...f, path: t }))}
            autoCapitalize="none"
          />
          <Text style={styles.fieldLabel}>Icon name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. build"
            placeholderTextColor={COLORS.gray400}
            value={form.icon}
            onChangeText={t => setForm(f => ({ ...f, icon: t }))}
            autoCapitalize="none"
          />
          <Text style={styles.fieldLabel}>Order (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={COLORS.gray400}
            value={form.order}
            onChangeText={t => setForm(f => ({ ...f, order: t }))}
            keyboardType="numeric"
          />
          <Text style={styles.fieldLabel}>Parent item (optional)</Text>
          <View style={styles.chipsRow}>
            {[{ id: 0, label: '(None)' }, ...topLevel].map(opt => {
              const active = String(opt.id) === form.parent_id;
              return (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() =>
                    setForm(f => ({ ...f, parent_id: opt.id ? String(opt.id) : '' }))
                  }
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.fieldLabel}>Visible to (optional)</Text>
          <View style={styles.chipsRow}>
            {ROLES.map(role => {
              const active = form.role === role;
              return (
                <Pressable
                  key={role || 'all'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setForm(f => ({ ...f, role }))}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {role || 'all'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={styles.activeRow}
            onPress={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
          >
            <MaterialIcons
              name={form.is_active ? 'check-box' : 'check-box-outline-blank'}
              size={20}
              color={form.is_active ? COLORS.primary : COLORS.gray400}
            />
            <Text style={styles.activeLabel}>Active</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryBtn, saving && styles.btnDisabled]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.primaryBtnText}>
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Add menu item'}
            </Text>
          </Pressable>
        </ScrollView>
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
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  path: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  rolePill: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.neutralText,
  },
  child: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginLeft: SPACING.md,
    paddingLeft: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary200,
    gap: SPACING.sm,
  },
  childLabel: {
    fontSize: 12,
    color: COLORS.gray700,
    fontWeight: '500',
    flex: 0.6,
  },
  childPath: {
    fontSize: 10,
    color: COLORS.gray400,
    flex: 0.7,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  chipActive: {
    backgroundColor: COLORS.primary100,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: COLORS.primary700,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  activeLabel: {
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

export default AdminMenusScreen;

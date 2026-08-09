import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import RoleBadge from '../../components/RoleBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminHeader from '../../components/AdminHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string;
}

const ROLES = ['customer', 'vendor', 'admin', 'super_admin'];

const AdminUsersScreen: React.FC = () => {
  const { user: me, isSuperAdmin } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'primary' | 'warning';
    icon?: string;
    fn: () => void;
  } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
  });
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/users', { params: { per_page: 100 } });
      setUsers(res.data.data ?? res.data);
    } catch (e) {
      console.warn('admin users load failed', e);
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

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const createUser = async () => {
    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/users', {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phone: createForm.phone.trim() || undefined,
        role: createForm.role,
        business_name:
          createForm.role === 'vendor' ? `${createForm.name.trim()}'s Business` : undefined,
      });
      setShowCreate(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'customer',
      });
      load();
      toast.success('User created successfully.');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.response?.data?.errors ?? 'Could not create user.';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (role: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/admin/users/${selected.id}`, { role });
      setSelected(null);
      load();
      toast.success(`Role changed to ${role}.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not change role.');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.post(`/admin/users/${selected.id}/reset-password`, {
        action: 'generate',
      });
      const newPassword = res.data?.password ?? res.data?.temp_password;
      setSelected(null);
      toast.info(
        newPassword
          ? `New password for ${selected.name}: ${newPassword}\n\nShare it securely with the user.`
          : `Password reset for ${selected.name}.`,
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not reset password.');
    } finally {
      setSaving(false);
    }
  };

  const removeUser = () => {
    if (!selected) return;
    const target = selected;
    setConfirm({
      title: 'Delete user',
      message: `Delete ${target.name} (${target.email})? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: 'delete-outline',
      fn: async () => {
        setSaving(true);
        try {
          await api.delete(`/admin/users/${target.id}`);
          setSelected(null);
          load();
          toast.success('User deleted.');
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Could not delete user.');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const openUser = (u: AdminUser) => {
    if (u.id === me?.id) return;
    setSelected(u);
    setEditForm({ name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' });
  };

  const saveDetails = async () => {
    if (!selected) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/users/${selected.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || undefined,
      });
      setSelected(null);
      load();
      toast.success('User details updated.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not update user.');
    } finally {
      setSaving(false);
    }
  };

  const renderUser = ({ item }: { item: AdminUser }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => openUser(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name
            .split(' ')
            .map(p => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {item.email}
        </Text>
      </View>
      <View style={styles.right}>
        <RoleBadge role={item.role} />
        <View style={styles.activeRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: item.is_active ? COLORS.successText : COLORS.rose },
            ]}
          />
          <Text style={styles.activeText}>
            {item.is_active ? 'active' : 'inactive'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRoleOptions = () => {
    const available = isSuperAdmin ? ROLES : ['customer', 'vendor', 'admin'];
    return available.map(role => {
      const active = createForm.role === role;
      return (
        <TouchableOpacity
          key={role}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => setCreateForm(f => ({ ...f, role }))}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>
            {role}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Users" subtitle="Manage all accounts" />

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={18} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or email..."
            placeholderTextColor={COLORS.gray400}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 ? (
            <MaterialIcons
              name="close"
              size={18}
              color={COLORS.gray400}
              onPress={() => setSearch('')}
            />
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreate(true)}
        >
          <MaterialIcons name="person-add" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
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
              title="No users found"
              message="Try a different search or refresh."
            />
          }
        />
      )}

      <Modal
        visible={showCreate}
        title="Create user"
        icon="person-add"
        subtitle="Create a new account"
        onClose={() => setShowCreate(false)}
      >
        <Text style={styles.label}>Full name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ram Sharma"
          placeholderTextColor={COLORS.gray400}
          value={createForm.name}
          onChangeText={t => setCreateForm(f => ({ ...f, name: t }))}
        />
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="user@email.com"
          placeholderTextColor={COLORS.gray400}
          value={createForm.email}
          onChangeText={t => setCreateForm(f => ({ ...f, email: t }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="Min 6 characters"
          placeholderTextColor={COLORS.gray400}
          value={createForm.password}
          onChangeText={t => setCreateForm(f => ({ ...f, password: t }))}
          secureTextEntry
        />
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="98XXXXXXXX"
          placeholderTextColor={COLORS.gray400}
          value={createForm.phone}
          onChangeText={t => setCreateForm(f => ({ ...f, phone: t }))}
          keyboardType="phone-pad"
        />
        <Text style={styles.label}>Role *</Text>
        <View style={styles.chipsRow}>{renderRoleOptions()}</View>

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={createUser}
          disabled={saving}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? 'Creating...' : 'Create user'}
          </Text>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!selected}
        title={selected?.name ?? ''}
        icon="edit"
        subtitle={selected?.email}
        onClose={() => setSelected(null)}
      >
        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={editForm.name}
          onChangeText={t => setEditForm(f => ({ ...f, name: t }))}
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={editForm.email}
          onChangeText={t => setEditForm(f => ({ ...f, email: t }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={editForm.phone}
          onChangeText={t => setEditForm(f => ({ ...f, phone: t }))}
          keyboardType="phone-pad"
          placeholder="98XXXXXXXX"
          placeholderTextColor={COLORS.gray400}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={saveDetails}
          disabled={saving}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? 'Saving...' : 'Save details'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Change role</Text>
        <View style={styles.chipsRow}>
          {(isSuperAdmin ? ROLES : ['customer', 'vendor', 'admin']).map(role => {
            const active = selected?.role === role;
            return (
              <TouchableOpacity
                key={role}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => changeRole(role)}
                disabled={saving || active}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {role}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.secondaryBtn, saving && styles.btnDisabled]}
          onPress={resetPassword}
          disabled={saving}
        >
          <MaterialIcons name="lock-reset" size={16} color={COLORS.gray600} />
          <Text style={styles.secondaryBtnText}>Reset password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerBtn, saving && styles.btnDisabled]}
          onPress={removeUser}
          disabled={saving}
        >
          <MaterialIcons name="delete-outline" size={16} color={COLORS.white} />
          <Text style={styles.dangerBtnText}>Delete user</Text>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        icon={confirm?.icon}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.gray900,
    paddingVertical: 0,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
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
    marginBottom: 12,
    ...SHADOW.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary700,
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  email: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  activeText: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray600,
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 46,
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
    backgroundColor: COLORS.gray50,
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
    color: COLORS.gray700,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: COLORS.primary,
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
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  secondaryBtnText: {
    color: COLORS.gray700,
    fontSize: 14,
    fontWeight: '700',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: COLORS.rose,
    borderRadius: RADIUS.pill,
    height: 46,
  },
  dangerBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdminUsersScreen;
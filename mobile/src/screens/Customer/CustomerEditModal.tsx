import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { validatePhone } from '../../utils/security';

const CustomerEditModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm({
        name: user?.name ?? '',
        phone: user?.phone ?? '',
        address: '',
      });
      api
        .get('/user')
        .then(res => {
          const u = res.data ?? {};
          setForm(f => ({
            ...f,
            name: u.name ?? f.name,
            phone: u.phone ?? f.phone,
            address: u.address ?? '',
          }));
        })
        .catch(() => {});
    }
  }, [visible, user]);

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing', 'Name is required.');
      return;
    }
    if (form.phone && !validatePhone(form.phone)) {
      Alert.alert('Invalid phone', 'Enter a valid phone number.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/user/profile', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      const updated = data?.user;
      if (updated && user) {
        updateUser({ ...user, name: updated.name, phone: updated.phone ?? null });
      }
      Alert.alert('Saved', 'Profile updated.');
      onClose();
    } catch (e: any) {
      Alert.alert(
        'Failed',
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not save profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} title="Edit Profile" onClose={onClose}>
      <Text style={styles.label}>Full name *</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor={COLORS.gray400}
        value={form.name}
        onChangeText={t => setForm(f => ({ ...f, name: t }))}
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        placeholder="+977 98XXXXXXXX"
        placeholderTextColor={COLORS.gray400}
        value={form.phone}
        onChangeText={t => setForm(f => ({ ...f, phone: t }))}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Saved address</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="e.g. 45 Baneshwor, Kathmandu"
        placeholderTextColor={COLORS.gray400}
        value={form.address}
        onChangeText={t => setForm(f => ({ ...f, address: t }))}
        multiline
        numberOfLines={3}
      />
      <Text style={styles.hint}>
        Used to prefill your address when booking services.
      </Text>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={save}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.saveBtnText}>Save changes</Text>
        )}
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
    marginTop: SPACING.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.md,
    height: 44,
    fontSize: 14,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 76,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.gray500,
  },
  saveBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default CustomerEditModal;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { validatePhone } from '../../utils/security';

const CustomerEditModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
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
      toast.error('Name is required.');
      return;
    }
    if (form.phone && !validatePhone(form.phone)) {
      toast.error('Enter a valid phone number.');
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
      toast.success('Profile updated.');
      onClose();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not save profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} title="Edit Profile" subtitle="Update your details" icon="edit" onClose={onClose}>
      <View style={styles.field}>
        <Text style={styles.label}>Full name *</Text>
        <View style={styles.inputWrap}>
          <MaterialIcons name="person" size={20} color={COLORS.gray400} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={COLORS.gray400}
            value={form.name}
            onChangeText={t => setForm(f => ({ ...f, name: t }))}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        <View style={styles.inputWrap}>
          <MaterialIcons name="smartphone" size={20} color={COLORS.gray400} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="+977 98XXXXXXXX"
            placeholderTextColor={COLORS.gray400}
            value={form.phone}
            onChangeText={t => setForm(f => ({ ...f, phone: t }))}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Saved address</Text>
        <View style={styles.inputWrap}>
          <MaterialIcons name="home" size={20} color={COLORS.gray400} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="e.g. 45 Baneshwor, Kathmandu"
            placeholderTextColor={COLORS.gray400}
            value={form.address}
            onChangeText={t => setForm(f => ({ ...f, address: t }))}
            multiline
            numberOfLines={3}
          />
        </View>
        <Text style={styles.hint}>
          Used to prefill your address when booking services.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.85}
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
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingLeft: 46,
    paddingRight: SPACING.md,
    height: 50,
    fontSize: 14,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.gray500,
  },
  saveBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 50,
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
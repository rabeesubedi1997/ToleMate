import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

const FIELDS: { key: string; label: string }[] = [
  { key: 'site_name', label: 'Site name' },
  { key: 'contact_email', label: 'Contact email' },
  { key: 'hero_title', label: 'Hero title' },
  { key: 'hero_subtitle', label: 'Hero subtitle' },
  { key: 'slider_interval', label: 'Slider interval (ms)' },
];

const AdminSettingsScreen: React.FC = () => {
  const toast = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      const data = res.data ?? {};
      const next: Record<string, string> = {};
      FIELDS.forEach(f => {
        next[f.key] = String(data[f.key] ?? '');
      });
      setForm(next);
    } catch (e) {
      console.warn('settings load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/admin/settings', {
        settings: FIELDS.map(f => ({ key: f.key, value: form[f.key] ?? '' })),
      });
      toast.success('Settings updated.');
    } catch {
      toast.error('Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Settings" subtitle="Site configuration" />
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" subtitle="Site configuration" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {FIELDS.map(f => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={form[f.key] ?? ''}
                onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                placeholderTextColor={COLORS.gray400}
                autoCapitalize={f.key === 'contact_email' ? 'none' : 'sentences'}
              />
            </View>
          ))}
        </View>
        <Pressable
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Settings'}</Text>
        </Pressable>
      </ScrollView>
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
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: 4,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: 12,
    ...SHADOW.card,
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray600,
    marginBottom: 6,
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
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  saveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdminSettingsScreen;
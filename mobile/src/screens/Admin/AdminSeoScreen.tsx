import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

const FIELDS: { key: string; label: string }[] = [
  { key: 'seo_home_title', label: 'Home meta title' },
  { key: 'seo_home_desc', label: 'Home meta description' },
  { key: 'seo_home_keywords', label: 'Keywords (comma separated)' },
  { key: 'seo_og_image', label: 'OG image URL' },
  { key: 'seo_gtm_id', label: 'GTM ID' },
  { key: 'seo_site_verification', label: 'Site verification code' },
  { key: 'seo_schema_org', label: 'Schema.org JSON' },
];

const AdminSeoScreen: React.FC = () => {
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
      console.warn('seo load failed', e);
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
      Alert.alert('Saved', 'SEO settings updated.');
    } catch {
      Alert.alert('Failed', 'Could not save SEO settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="SEO" subtitle="Search engine settings" />
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="SEO" subtitle="Search engine settings" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {FIELDS.map(f => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={[styles.input, f.key === 'seo_schema_org' && styles.inputBig]}
                value={form[f.key] ?? ''}
                onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="none"
                multiline={f.key === 'seo_schema_org'}
              />
            </View>
          ))}
        </View>
        <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save SEO'}</Text>
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
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
    marginBottom: 4,
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
  inputBig: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AdminSeoScreen;

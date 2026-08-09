import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';
import { MainStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

interface Category {
  id: number;
  name: string;
}

const URGENCIES = ['asap', 'this_week', 'this_month', 'flexible'];

const PostRequestScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [budget, setBudget] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [urgency, setUrgency] = useState('flexible');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api
        .get('/categories')
        .then(res => setCategories(res.data ?? []))
        .catch(() => setCategories([]));
    }, []),
  );

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your request.');
      return;
    }
    if (!categoryId) {
      toast.error('Please pick a category.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/booking-requests', {
        title: title.trim(),
        text: text.trim() || undefined,
        category_id: Number(categoryId),
        budget: budget ? Number(budget) : undefined,
        preferred_date: preferredDate.trim() || undefined,
        urgency,
      });
      toast.success('Request posted — vendors can now send quotes.');
      navigation.goBack();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not post request.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Post a Request" subtitle="Tell vendors what you need" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>What do you need? *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sofa deep cleaning"
            placeholderTextColor={COLORS.gray400}
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Describe the job in detail..."
              placeholderTextColor={COLORS.gray400}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.chipsRow}>
            {categories.map(c => {
              const active = categoryId === String(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoryId(String(c.id))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Budget & timing</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Budget (Rs., optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 3000"
              placeholderTextColor={COLORS.gray400}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.fieldLabel}>Preferred date (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (e.g. 2026-08-15)"
            placeholderTextColor={COLORS.gray400}
            value={preferredDate}
            onChangeText={setPreferredDate}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Urgency</Text>
          <View style={styles.chipsRow}>
            {URGENCIES.map(u => {
              const active = urgency === u;
              return (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setUrgency(u)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {u.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MaterialIcons name="send" size={18} color={COLORS.white} />
              <Text style={styles.submitBtnText}>Post Request</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  field: {
    marginTop: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.gray500,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.md,
    height: 50,
    fontSize: 14,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 50,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default PostRequestScreen;
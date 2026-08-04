import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
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
      Alert.alert('Missing', 'Please enter a title for your request.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Missing', 'Please pick a category.');
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
      Alert.alert(
        'Request posted',
        'Vendors can now see your request and send quotes.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert(
        'Failed',
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
          <Text style={styles.label}>WHAT DO YOU NEED? *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sofa deep cleaning"
            placeholderTextColor={COLORS.gray400}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Describe the job in detail..."
            placeholderTextColor={COLORS.gray400}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>CATEGORY *</Text>
          <View style={styles.chipsRow}>
            {categories.map(c => {
              const active = categoryId === String(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoryId(String(c.id))}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>BUDGET (RS., OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 3000"
            placeholderTextColor={COLORS.gray400}
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
          />

          <Text style={styles.label}>PREFERRED DATE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (e.g. 2026-08-15)"
            placeholderTextColor={COLORS.gray400}
            value={preferredDate}
            onChangeText={setPreferredDate}
            autoCapitalize="none"
          />

          <Text style={styles.label}>URGENCY</Text>
          <View style={styles.chipsRow}>
            {URGENCIES.map(u => {
              const active = urgency === u;
              return (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setUrgency(u)}
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
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gray600,
    marginTop: SPACING.md,
    marginBottom: 6,
    letterSpacing: 1,
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
    height: 96,
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
    paddingVertical: 7,
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
  },
  chipTextActive: {
    color: COLORS.primary700,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
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

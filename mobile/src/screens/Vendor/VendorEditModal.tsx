import React, { useState, useEffect } from 'react';
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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../api/client';
import Modal from '../../components/Modal';
import { COLORS, SPACING, RADIUS } from '../../theme';

interface VendorProfile {
  business_name?: string;
  description?: string | null;
  service_area_radius?: number;
  service_radius_km?: number | null;
  location?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp_number?: string | null;
}

interface DaySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VendorEditModal: React.FC<{
  visible: boolean;
  profile: VendorProfile | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ visible, profile, onClose, onSaved }) => {
  const [form, setForm] = useState({
    business_name: '',
    description: '',
    service_area_radius: '',
    service_radius_km: '',
    location: '',
    website: '',
    instagram: '',
    facebook: '',
    whatsapp_number: '',
  });
  const [availability, setAvailability] = useState<DaySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm({
        business_name: profile?.business_name ?? '',
        description: profile?.description ?? '',
        service_area_radius: profile?.service_area_radius?.toString() ?? '',
        service_radius_km: profile?.service_radius_km?.toString() ?? '',
        location: profile?.location ?? '',
        website: profile?.website ?? '',
        instagram: profile?.instagram ?? '',
        facebook: profile?.facebook ?? '',
        whatsapp_number: profile?.whatsapp_number ?? '',
      });
      setLoading(true);
      api
        .get('/vendor/availability')
        .then(res => setAvailability(res.data?.availability ?? []))
        .catch(() => setAvailability([]))
        .finally(() => setLoading(false));
    }
  }, [visible, profile]);

  const save = async () => {
    if (!form.business_name.trim()) {
      Alert.alert('Missing', 'Business name is required.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/vendor/profile', {
        business_name: form.business_name.trim(),
        description: form.description.trim() || undefined,
        service_area_radius: form.service_area_radius ? Number(form.service_area_radius) : undefined,
        service_radius_km: form.service_radius_km ? Number(form.service_radius_km) : undefined,
        location: form.location.trim() || undefined,
        website: form.website.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
        facebook: form.facebook.trim() || undefined,
        whatsapp_number: form.whatsapp_number.trim() || undefined,
      });
      const bad = availability.find(
        d => !/^\d{2}:\d{2}$/.test(d.start_time) || !/^\d{2}:\d{2}$/.test(d.end_time),
      );
      if (bad) {
        Alert.alert('Invalid time', 'Availability times must be in HH:MM format.');
        setSaving(false);
        return;
      }
      await api.put('/vendor/availability', { availability });
      Alert.alert('Saved', 'Business profile updated.');
      onSaved();
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

  const set = (key: keyof typeof form) => (t: string) => setForm(f => ({ ...f, [key]: t }));

  return (
    <Modal visible={visible} title="Edit Business Profile" onClose={onClose}>
      <ScrollView>
        <Text style={styles.label}>BUSINESS NAME *</Text>
        <TextInput
          style={styles.input}
          placeholder="Business name"
          placeholderTextColor={COLORS.gray400}
          value={form.business_name}
          onChangeText={set('business_name')}
        />

        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Tell customers about your business..."
          placeholderTextColor={COLORS.gray400}
          value={form.description}
          onChangeText={set('description')}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>SERVICE RADIUS (KM)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 25"
          placeholderTextColor={COLORS.gray400}
          value={form.service_area_radius}
          onChangeText={set('service_area_radius')}
          keyboardType="numeric"
        />

        <Text style={styles.label}>LOCATION</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Kathmandu"
          placeholderTextColor={COLORS.gray400}
          value={form.location}
          onChangeText={set('location')}
        />

        <Text style={styles.label}>WEBSITE</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          placeholderTextColor={COLORS.gray400}
          value={form.website}
          onChangeText={set('website')}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>INSTAGRAM</Text>
        <TextInput
          style={styles.input}
          placeholder="instagram.com/yourpage"
          placeholderTextColor={COLORS.gray400}
          value={form.instagram}
          onChangeText={set('instagram')}
          autoCapitalize="none"
        />

        <Text style={styles.label}>FACEBOOK</Text>
        <TextInput
          style={styles.input}
          placeholder="facebook.com/yourpage"
          placeholderTextColor={COLORS.gray400}
          value={form.facebook}
          onChangeText={set('facebook')}
          autoCapitalize="none"
        />

        <Text style={styles.label}>WHATSAPP NUMBER</Text>
        <TextInput
          style={styles.input}
          placeholder="98XXXXXXXX"
          placeholderTextColor={COLORS.gray400}
          value={form.whatsapp_number}
          onChangeText={set('whatsapp_number')}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>WEEKLY AVAILABILITY</Text>
        {loading ? (
          <ActivityIndicator style={styles.loader} size="small" color={COLORS.primary} />
        ) : (
          availability.map(d => (
            <View key={d.day_of_week} style={styles.dayRow}>
              <TouchableOpacity
                style={styles.dayToggle}
                onPress={() =>
                  setAvailability(prev =>
                    prev.map(x =>
                      x.day_of_week === d.day_of_week
                        ? { ...x, is_available: !x.is_available }
                        : x,
                    ),
                  )
                }
              >
                <MaterialIcons
                  name={d.is_available ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={d.is_available ? COLORS.primary : COLORS.gray400}
                />
                <Text style={[styles.dayLabel, !d.is_available && styles.dayLabelOff]}>
                  {DAY_LABELS[d.day_of_week]}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.timeInput, !d.is_available && styles.timeInputOff]}
                value={d.start_time}
                onChangeText={t =>
                  setAvailability(prev =>
                    prev.map(x =>
                      x.day_of_week === d.day_of_week ? { ...x, start_time: t } : x,
                    ),
                  )
                }
                placeholder="09:00"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="none"
                maxLength={5}
              />
              <Text style={styles.dash}>–</Text>
              <TextInput
                style={[styles.timeInput, !d.is_available && styles.timeInputOff]}
                value={d.end_time}
                onChangeText={t =>
                  setAvailability(prev =>
                    prev.map(x =>
                      x.day_of_week === d.day_of_week ? { ...x, end_time: t } : x,
                    ),
                  )
                }
                placeholder="17:00"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="none"
                maxLength={5}
              />
            </View>
          ))
        )}

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
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    height: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  loader: {
    paddingVertical: SPACING.md,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: SPACING.xs,
  },
  dayToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  dayLabelOff: {
    color: COLORS.gray400,
  },
  timeInput: {
    width: 62,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 6,
    height: 36,
    fontSize: 13,
    color: COLORS.gray900,
    textAlign: 'center',
  },
  timeInputOff: {
    opacity: 0.4,
  },
  dash: {
    fontSize: 14,
    color: COLORS.gray400,
  },
  saveBtn: {
    marginTop: SPACING.lg,
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

export default VendorEditModal;

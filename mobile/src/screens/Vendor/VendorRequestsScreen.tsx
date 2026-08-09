import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface RequestItem {
  id: number;
  title: string;
  text?: string | null;
  budget?: string | number | null;
  preferred_date?: string | null;
  urgency?: string | null;
  created_at?: string;
  category?: { id: number; name?: string } | null;
  customer?: { id: number; name?: string } | null;
}

interface ServiceOption {
  id: number;
  name: string;
  price?: string | number | null;
  pricing_type?: string | null;
}

const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  asap: { bg: COLORS.roseBg, text: COLORS.roseText },
  this_week: { bg: COLORS.warningBg, text: COLORS.warningText },
  this_month: { bg: COLORS.infoBg, text: COLORS.infoText },
  flexible: { bg: COLORS.neutralBg, text: COLORS.neutralText },
};

const VendorRequestsScreen: React.FC = () => {
  const toast = useToast();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [myServices, setMyServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const catRes = await api.get('/categories').catch(() => ({ data: [] }));
      const cats: { id: number; name: string }[] = catRes.data ?? [];
      setCategories(cats);
      const params: Record<string, string> = { per_page: '50' };
      if (filter !== 'all') {
        const cat = cats.find(c => c.name === filter);
        if (cat) params.category_id = String(cat.id);
      }
      const reqRes = await api.get('/booking-requests', { params });
      setItems(reqRes.data.data ?? reqRes.data ?? []);
    } catch (e) {
      console.warn('requests load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openRespond = async (item: RequestItem) => {
    setSelected(item);
    setServiceId(null);
    setPrice(item.budget ? String(Number(item.budget) * 0.8) : '');
    setMessage('');
    setBusy(false);
    try {
      const res = await api.get('/services', { params: { per_page: 100 } });
      setMyServices(res.data.data ?? res.data ?? []);
    } catch {
      setMyServices([]);
    }
  };

  const respond = async () => {
    if (!selected) return;
    if (!serviceId) {
      toast.info('Pick one of your services for the quote.');
      return;
    }
    if (!price || Number(price) <= 0) {
      toast.info('Enter a quote price.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/booking-requests/${selected.id}/respond`, {
        service_id: Number(serviceId),
        price: Number(price),
        message: message.trim() || undefined,
      });
      toast.success('Quote sent.');
      setSelected(null);
      load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ??
          Object.values(e?.response?.data?.errors ?? {}).flat()[0] ??
          'Could not send quote.',
      );
    } finally {
      setBusy(false);
    }
  };

  const renderItem = ({ item }: { item: RequestItem }) => {
    const urg = item.urgency ?? 'flexible';
    const urgStyle = URGENCY_COLORS[urg] ?? URGENCY_COLORS.flexible;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => openRespond(item)}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.urgPill, { backgroundColor: urgStyle.bg }]}>
            <Text style={[styles.urgText, { color: urgStyle.text }]}>
              {urg.replace('_', ' ')}
            </Text>
          </View>
        </View>
        {item.text ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.text}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{item.customer?.name ?? 'Customer'}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{item.category?.name ?? 'General'}</Text>
          {item.budget ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>Rs {item.budget}</Text>
            </>
          ) : null}
        </View>
        {item.preferred_date ? (
          <Text style={styles.date}>Prefers: {item.preferred_date}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const filterChips = ['all', ...categories.map(c => c.name)];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ToleMate</Text>
          <Text style={styles.title}>Requests</Text>
        </View>
        <View style={styles.headerBadge}>
          <MaterialIcons name="assignment" size={20} color={COLORS.primary} />
        </View>
      </View>

      <FilterChips options={filterChips} selected={filter} onSelect={setFilter} />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={items}
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
            <EmptyState
              title="No open requests"
              message="Customers post requests here when they need help."
            />
          }
        />
      )}

      <Modal
        visible={!!selected}
        title="Send a Quote"
        subtitle={selected?.title}
        icon="assignment"
        onClose={() => setSelected(null)}
      >
        <ScrollView>
          {selected ? (
            <>
              <Text style={styles.modalTitle}>{selected.title}</Text>
              {selected.text ? <Text style={styles.modalText}>{selected.text}</Text> : null}

              <Text style={styles.label}>SELECT YOUR SERVICE *</Text>
              {myServices.length === 0 ? (
                <Text style={styles.warn}>
                  You have no services. Create a service first in the Services tab.
                </Text>
              ) : (
                <View style={styles.chipsRow}>
                  {myServices.map(s => {
                    const active = serviceId === String(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setServiceId(String(s.id))}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.label}>QUOTE PRICE (RS.) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={COLORS.gray400}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />

              <Text style={styles.label}>MESSAGE (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Tell the customer about your quote..."
                placeholderTextColor={COLORS.gray400}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.sendBtn, busy && styles.btnDisabled]}
                onPress={respond}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.sendBtnText}>Send Quote</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  loader: {
    marginTop: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xl,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  urgPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  desc: {
    fontSize: 13,
    color: COLORS.gray600,
    marginTop: 6,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 11,
    color: COLORS.gray300,
    marginHorizontal: 4,
  },
  date: {
    fontSize: 11,
    color: COLORS.infoText,
    fontWeight: '600',
    marginTop: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  modalText: {
    fontSize: 13,
    color: COLORS.gray600,
    marginTop: 4,
    lineHeight: 19,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gray600,
    marginTop: SPACING.md,
    marginBottom: 6,
    letterSpacing: 1,
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
  warn: {
    fontSize: 12,
    color: COLORS.roseText,
    backgroundColor: COLORS.roseBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SPACING.md,
    height: 46,
    fontSize: 14,
    color: COLORS.gray900,
  },
  inputMultiline: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  sendBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default VendorRequestsScreen;

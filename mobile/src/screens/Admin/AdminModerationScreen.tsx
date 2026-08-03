import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

interface Service {
  id: number;
  name: string;
  description?: string;
  price: string;
  status: string;
  is_active: boolean;
  rejection_reason?: string | null;
  category?: { id: number; name?: string } | null;
  vendor?: { id: number; user?: { name?: string } } | null;
}

const STATUSES = ['pending', 'approved', 'rejected', 'draft'];

const AdminModerationScreen: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Service | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/super-admin/services/moderation', {
        params: { status: filter, per_page: 100 },
      });
      setServices(res.data.data ?? res.data ?? []);
    } catch (e) {
      console.warn('moderation load failed', e);
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

  const approve = async (service: Service) => {
    setActionLoading(`approve-${service.id}`);
    try {
      await api.post(`/super-admin/services/${service.id}/approve`);
      load();
    } catch {
      Alert.alert('Failed', 'Could not approve service.');
    } finally {
      setActionLoading(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(`reject-${rejectTarget.id}`);
    try {
      await api.post(`/super-admin/services/${rejectTarget.id}/reject`, {
        reason: reason.trim() || 'Not approved',
      });
      setRejectTarget(null);
      setReason('');
      load();
    } catch {
      Alert.alert('Failed', 'Could not reject service.');
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: Service }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {item.vendor?.user?.name ?? '—'} · {item.category?.name ?? '—'}
      </Text>
      <Text style={styles.price}>Rs {item.price}</Text>
      <Text style={styles.desc} numberOfLines={2}>
        {item.description}
      </Text>
      {item.status === 'rejected' && item.rejection_reason ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>Reason</Text>
          <Text style={styles.reasonText}>{item.rejection_reason}</Text>
        </View>
      ) : null}
      {item.status === 'pending' ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.approveBtn]}
            onPress={() => approve(item)}
            disabled={actionLoading === `approve-${item.id}`}
          >
            {actionLoading === `approve-${item.id}` ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.approveText}>Approve</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.btn, styles.rejectBtn]}
            onPress={() => setRejectTarget(item)}
            disabled={actionLoading === `reject-${item.id}`}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Moderation" subtitle="Review services before they go live" />
      <FilterChips options={STATUSES} selected={filter} onSelect={setFilter} />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={services}
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
              title="Queue is clear"
              message={`No ${filter} services right now.`}
            />
          }
        />
      )}

      <Modal
        visible={rejectTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTarget(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Reject service</Text>
            <Text style={styles.modalHint}>
              Tell the vendor why this service was rejected.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Rejection reason"
              placeholderTextColor={COLORS.gray400}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <View style={styles.modalRow}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setRejectTarget(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={submitReject}
                disabled={actionLoading !== null}
              >
                <Text style={styles.saveText}>
                  {actionLoading ? 'Rejecting...' : 'Reject'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    marginRight: SPACING.sm,
  },
  meta: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary700,
    marginTop: SPACING.xs,
  },
  desc: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  reasonBox: {
    backgroundColor: COLORS.roseBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.roseText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.gray700,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  btn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: COLORS.primary,
  },
  rejectBtn: {
    backgroundColor: COLORS.roseBg,
  },
  approveText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  rejectText: {
    color: COLORS.roseText,
    fontWeight: '700',
    fontSize: 13,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modal: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  modalHint: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    minHeight: 80,
    fontSize: 14,
    color: COLORS.gray900,
    textAlignVertical: 'top',
  },
  modalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.gray100,
  },
  saveBtn: {
    backgroundColor: COLORS.rose,
  },
  cancelText: {
    color: COLORS.gray700,
    fontWeight: '600',
    fontSize: 13,
  },
  saveText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default AdminModerationScreen;

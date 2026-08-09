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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import FilterChips from '../../components/FilterChips';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';

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
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Service | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    tone?: 'danger' | 'primary' | 'warning';
    confirmLabel?: string;
    icon?: string;
    fn: () => void;
  } | null>(null);

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
      toast.success('Service approved.');
    } catch {
      toast.error('Could not approve service.');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmApprove = (service: Service) =>
    setConfirm({
      title: 'Approve service',
      message: `Approve "${service.name}" so it goes live?`,
      confirmLabel: 'Approve',
      icon: 'check-circle',
      tone: 'primary',
      fn: () => approve(service),
    });

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
      toast.success('Service rejected.');
    } catch {
      toast.error('Could not reject service.');
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
            onPress={() => confirmApprove(item)}
            disabled={actionLoading === `approve-${item.id}`}
          >
            {actionLoading === `approve-${item.id}` ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Approve</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.btn, styles.rejectBtn]}
            onPress={() => setRejectTarget(item)}
            disabled={actionLoading === `reject-${item.id}`}
          >
            <Text style={styles.btnText}>Reject</Text>
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
        title="Reject service"
        subtitle="Tell the vendor why this service was rejected."
        icon="block"
        onClose={() => setRejectTarget(null)}
      >
        <Text style={styles.fieldLabel}>Rejection reason</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Why is this service being rejected?"
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
            {actionLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveText}>Reject</Text>
            )}
          </Pressable>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        tone={confirm?.tone}
        icon={confirm?.icon}
        confirmLabel={confirm?.confirmLabel}
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
  loader: {
    marginTop: 60,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    paddingBottom: SPACING.xl + 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  meta: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.gray500,
  },
  price: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.primary700,
    marginTop: SPACING.xs,
  },
  desc: {
    fontSize: FONT_SIZE.sm,
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
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray700,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  btn: {
    flex: 1,
    maxWidth: 140,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: COLORS.primary,
  },
  rejectBtn: {
    backgroundColor: COLORS.rose,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.base,
  },
  fieldLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray600,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.base,
    color: COLORS.gray900,
  },
  inputMultiline: {
    minHeight: 88,
    height: 'auto',
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  modalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  saveBtn: {
    backgroundColor: COLORS.rose,
  },
  cancelText: {
    color: COLORS.gray700,
    fontWeight: '700',
    fontSize: FONT_SIZE.base,
  },
  saveText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.base,
  },
});

export default AdminModerationScreen;
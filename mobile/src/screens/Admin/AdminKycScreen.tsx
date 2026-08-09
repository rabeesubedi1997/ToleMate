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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../../theme';

interface KycDocument {
  id: number;
  type: string;
  status: string;
  file_path: string;
  rejection_reason?: string | null;
}

interface KycVendor {
  id: number;
  business_name: string;
  is_verified: boolean;
  kyc_status: string;
  created_at: string;
  user?: { id: number; name?: string; email?: string } | null;
  documents?: KycDocument[];
}

const AdminKycScreen: React.FC = () => {
  const toast = useToast();
  const [vendors, setVendors] = useState<KycVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectDoc, setRejectDoc] = useState<KycDocument | null>(null);
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
      const res = await api.get('/super-admin/kyc/pending');
      setVendors(res.data ?? []);
    } catch (e) {
      console.warn('kyc load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const approveDoc = async (doc: KycDocument) => {
    setActionLoading(`approve-${doc.id}`);
    try {
      await api.post(`/super-admin/kyc/documents/${doc.id}/approve`);
      load();
      toast.success('Document approved.');
    } catch {
      toast.error('Could not approve document.');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmApprove = (doc: KycDocument) =>
    setConfirm({
      title: 'Approve document',
      message: `Approve the ${doc.type.replace(/_/g, ' ')} document?`,
      confirmLabel: 'Approve',
      icon: 'check-circle',
      tone: 'primary',
      fn: () => approveDoc(doc),
    });

  const submitReject = async () => {
    if (!rejectDoc) return;
    setActionLoading(`reject-${rejectDoc.id}`);
    try {
      await api.post(`/super-admin/kyc/documents/${rejectDoc.id}/reject`, {
        reason: reason.trim() || 'Not approved',
      });
      setRejectDoc(null);
      setReason('');
      load();
      toast.success('Document rejected.');
    } catch {
      toast.error('Could not reject document.');
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: KycVendor }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.business_name}
        </Text>
        <StatusBadge status={item.kyc_status} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {item.user?.name ?? '—'} · {item.user?.email ?? '—'}
      </Text>

      {(item.documents ?? []).length === 0 ? (
        <Text style={styles.noDocs}>No documents submitted</Text>
      ) : (
        item.documents?.map(doc => (
          <View key={doc.id} style={styles.docRow}>
            <View style={styles.docIcon}>
              <MaterialIcons name="description" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.docBody}>
              <Text style={styles.docType}>
                {doc.type.replace(/_/g, ' ')}
              </Text>
              <Text style={styles.docPath} numberOfLines={1}>
                {doc.file_path}
              </Text>
              {doc.rejection_reason ? (
                <Text style={styles.docReason} numberOfLines={2}>
                  Reason: {doc.rejection_reason}
                </Text>
              ) : null}
            </View>
            <View style={styles.docActions}>
              <Pressable
                style={styles.approveBtn}
                onPress={() => confirmApprove(doc)}
                disabled={actionLoading === `approve-${doc.id}`}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                {actionLoading === `approve-${doc.id}` ? (
                  <ActivityIndicator size="small" color={COLORS.successText} />
                ) : (
                  <MaterialIcons name="check" size={20} color={COLORS.successText} />
                )}
              </Pressable>
              <Pressable
                style={styles.rejectBtn}
                onPress={() => setRejectDoc(doc)}
                disabled={actionLoading === `reject-${doc.id}`}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons name="close" size={20} color={COLORS.rose} />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="KYC Review" subtitle="Pending vendor verification" />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          data={vendors}
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
              title="No pending KYC"
              message="All vendor documents have been reviewed."
            />
          }
        />
      )}

      <Modal
        visible={rejectDoc !== null}
        title="Reject document"
        subtitle="Reason the document was rejected."
        icon="block"
        onClose={() => setRejectDoc(null)}
      >
        <Text style={styles.fieldLabel}>Rejection reason</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Why is this document being rejected?"
          placeholderTextColor={COLORS.gray400}
          value={reason}
          onChangeText={setReason}
          multiline
        />
        <View style={styles.modalRow}>
          <Pressable
            style={[styles.modalBtn, styles.cancelBtn]}
            onPress={() => setRejectDoc(null)}
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
  noDocs: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray400,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  docIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  docBody: {
    flex: 1,
  },
  docType: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.gray800,
    textTransform: 'capitalize',
  },
  docPath: {
    fontSize: 10,
    color: COLORS.gray400,
  },
  docReason: {
    fontSize: 10,
    color: COLORS.roseText,
    marginTop: 2,
  },
  docActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  approveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
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

export default AdminKycScreen;
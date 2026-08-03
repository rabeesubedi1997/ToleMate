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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../theme';

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
  const [vendors, setVendors] = useState<KycVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectDoc, setRejectDoc] = useState<KycDocument | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    } catch {
      Alert.alert('Failed', 'Could not approve document.');
    } finally {
      setActionLoading(null);
    }
  };

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
    } catch {
      Alert.alert('Failed', 'Could not reject document.');
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
        <View style={styles.kycPill}>
          <Text style={styles.kycText}>{item.kyc_status}</Text>
        </View>
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
                onPress={() => approveDoc(doc)}
                disabled={actionLoading === `approve-${doc.id}`}
              >
                <MaterialIcons name="check" size={16} color={COLORS.successText} />
              </Pressable>
              <Pressable
                style={styles.rejectBtn}
                onPress={() => setRejectDoc(doc)}
                disabled={actionLoading === `reject-${doc.id}`}
              >
                <MaterialIcons name="close" size={16} color={COLORS.roseText} />
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
        transparent
        animationType="fade"
        onRequestClose={() => setRejectDoc(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Reject document</Text>
            <Text style={styles.modalHint}>
              Reason the document was rejected.
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
                onPress={() => setRejectDoc(null)}
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
  kycPill: {
    backgroundColor: COLORS.warningBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kycText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.warningText,
    textTransform: 'capitalize',
  },
  meta: {
    fontSize: 11,
    color: COLORS.gray500,
  },
  noDocs: {
    fontSize: 12,
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
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  docBody: {
    flex: 1,
  },
  docType: {
    fontSize: 12,
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
    gap: 6,
    marginLeft: SPACING.sm,
  },
  approveBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
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

export default AdminKycScreen;

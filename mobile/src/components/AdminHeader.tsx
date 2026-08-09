import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import { COLORS, SPACING, FONT_SIZE } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  brand?: string;
}

const AdminHeader: React.FC<Props> = ({ title, subtitle, brand = 'ToleMate Admin' }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const initial = (user?.name ?? '?').split(' ')[0]?.[0] ?? '?';

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
      <View style={styles.brandRow}>
        <MaterialIcons name="handyman" size={16} color={COLORS.primary700} />
        <Text style={styles.brand}>{brand}</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {user ? (
          <View style={styles.user}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.name}
            </Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial.toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => setConfirmLogout(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="logout" size={20} color={COLORS.rose} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message={`You are signed in as ${user?.name ?? 'admin'}. Logging out returns you to the login screen.`}
        confirmLabel="Log out"
        icon="logout"
        tone="warning"
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brand: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 1,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  userName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray700,
    maxWidth: 90,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary200,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary700,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
});

export default AdminHeader;

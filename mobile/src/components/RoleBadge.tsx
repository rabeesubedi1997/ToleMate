import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  admin: { bg: COLORS.roseBg, text: COLORS.roseText },
  super_admin: { bg: '#f3e8ff', text: '#7e22ce' },
  vendor: { bg: COLORS.infoBg, text: COLORS.infoText },
  customer: { bg: COLORS.successBg, text: COLORS.successText },
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const style = ROLE_STYLES[role] ?? {
    bg: COLORS.neutralBg,
    text: COLORS.neutralText,
  };
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{role.replace('_', ' ')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});

export default RoleBadge;

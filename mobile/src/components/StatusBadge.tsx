import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: COLORS.warningBg, text: COLORS.warningText },
  confirmed: { bg: COLORS.infoBg, text: COLORS.infoText },
  accepted: { bg: COLORS.infoBg, text: COLORS.infoText },
  in_progress: { bg: COLORS.infoBg, text: COLORS.infoText },
  completed: { bg: COLORS.successBg, text: COLORS.successText },
  cancelled: { bg: COLORS.roseBg, text: COLORS.roseText },
  rejected: { bg: COLORS.roseBg, text: COLORS.roseText },
  paid: { bg: COLORS.successBg, text: COLORS.successText },
  escrow: { bg: '#ede9fe', text: '#6d28d9' },
  approved: { bg: COLORS.successBg, text: COLORS.successText },
  new: { bg: COLORS.infoBg, text: COLORS.infoText },
};

interface Props {
  status: string;
}

const StatusBadge: React.FC<Props> = ({ status }) => {
  const style =
    STATUS_STYLES[status.toLowerCase()] ?? {
      bg: COLORS.neutralBg,
      text: COLORS.neutralText,
    };
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>
        {status.replace(/_/g, ' ')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});

export default StatusBadge;

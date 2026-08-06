import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

interface Props {
  label: string;
  value: string | number;
  icon: string;
  tint?: string;
  onPress?: () => void;
}

const StatCard: React.FC<Props> = ({ label, value, icon, tint = COLORS.primary, onPress }) => (
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.7}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={[styles.iconWrap, { backgroundColor: `${tint}1a` }]}>
      <MaterialIcons name={icon} size={20} color={tint} />
    </View>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
    {onPress ? (
      <Text style={styles.hint}>Tap to view</Text>
    ) : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.md,
    margin: SPACING.xs,
    ...SHADOW.card,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  label: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  hint: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

export default StatCard;

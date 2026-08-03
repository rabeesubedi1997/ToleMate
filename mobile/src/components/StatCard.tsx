import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

interface Props {
  label: string;
  value: string | number;
  icon: string;
  tint?: string;
}

const StatCard: React.FC<Props> = ({ label, value, icon, tint = COLORS.primary }) => (
  <View style={styles.card}>
    <View style={[styles.iconWrap, { backgroundColor: `${tint}1a` }]}>
      <MaterialIcons name={icon} size={20} color={tint} />
    </View>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
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
});

export default StatCard;

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  title: string;
  message?: string;
  icon?: string;
}

const EmptyState: React.FC<Props> = ({ title, message, icon = 'inbox' }) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <MaterialIcons name={icon} size={34} color={COLORS.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary50,
    borderWidth: 1,
    borderColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  message: {
    marginTop: SPACING.xs,
    fontSize: 13,
    color: COLORS.slate500,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },
});

export default EmptyState;
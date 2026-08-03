import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  title: string;
  message?: string;
}

const EmptyState: React.FC<Props> = ({ title, message }) => (
  <View style={styles.container}>
    <MaterialIcons name="inbox" size={48} color={COLORS.slate400} />
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
  title: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  message: {
    marginTop: SPACING.xs,
    fontSize: 13,
    color: COLORS.slate500,
    textAlign: 'center',
  },
});

export default EmptyState;

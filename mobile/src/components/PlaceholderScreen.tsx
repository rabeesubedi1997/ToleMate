import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../theme';

interface Props {
  title: string;
}

const PlaceholderScreen: React.FC<Props> = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Coming in a later phase</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light,
    padding: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
  },
  subtitle: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.slate500,
  },
});

export default PlaceholderScreen;

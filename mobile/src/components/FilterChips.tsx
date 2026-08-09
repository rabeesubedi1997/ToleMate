import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme';

interface Props {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

const FilterChips: React.FC<Props> = ({ options, selected, onSelect }) => (
  <View style={styles.wrap}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map(option => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            style={[
              styles.chip,
              active && styles.chipActive,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[styles.label, active && styles.labelActive]}
            >
              {option === 'all' ? 'All' : option.replace(/_/g, ' ')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.sm,
  },
  row: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.gray50,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray700,
    textTransform: 'capitalize',
  },
  labelActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default FilterChips;

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
              active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[styles.label, active && { color: COLORS.white }]}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray700,
    textTransform: 'capitalize',
  },
});

export default FilterChips;

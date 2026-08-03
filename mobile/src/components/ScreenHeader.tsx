import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, FONT_SIZE } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  showUser?: boolean;
}

const ScreenHeader: React.FC<Props> = ({ title, subtitle, showUser = true }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const initial = (user?.name ?? '?').split(' ')[0]?.[0] ?? '?';
  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
      <TouchableOpacity
        style={styles.back}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="arrow-back" size={22} color={COLORS.gray900} />
      </TouchableOpacity>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showUser && user ? (
        <View style={styles.user}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name}
          </Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial.toUpperCase()}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
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
    maxWidth: 140,
  },
  userName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray700,
    maxWidth: 80,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary200,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary700,
  },
});

export default ScreenHeader;

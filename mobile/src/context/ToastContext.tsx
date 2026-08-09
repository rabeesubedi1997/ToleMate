import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../theme';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  show: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const TOAST_ICONS: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'error-outline',
  info: 'info-outline',
};

const TOAST_TINT: Record<ToastType, { fg: string; bg: string }> = {
  success: { fg: COLORS.successText, bg: COLORS.successBg },
  error: { fg: COLORS.roseText, bg: COLORS.roseBg },
  info: { fg: COLORS.infoText, bg: COLORS.infoBg },
};

const TOAST_DURATION = 2800;

let nextId = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -14,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (type: ToastType, message: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ id: nextId++, type, message });
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
      hideTimer.current = setTimeout(dismiss, TOAST_DURATION);
    },
    [dismiss, opacity, translateY],
  );

  const api: ToastApi = {
    show,
    success: m => show('success', m),
    error: m => show('error', m),
    info: m => show('info', m),
  };

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { top: insets.top + SPACING.xs },
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <View
            style={[
              styles.toast,
              { backgroundColor: TOAST_TINT[toast.type].bg },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: TOAST_TINT[toast.type].fg },
              ]}
            >
              <MaterialIcons
                name={TOAST_ICONS[toast.type]}
                size={16}
                color={COLORS.white}
              />
            </View>
            <Text style={[styles.text, { color: TOAST_TINT[toast.type].fg }]}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    maxWidth: 420,
    ...SHADOW.raised,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.gray800,
    flexShrink: 1,
    ...(Platform.OS === 'ios' ? {} : { fontFamily: undefined }),
  },
});
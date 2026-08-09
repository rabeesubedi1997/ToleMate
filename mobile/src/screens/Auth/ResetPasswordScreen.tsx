import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../theme';
import api from '../../api/client';
import { validateEmail, validatePasswordStrength } from '../../utils/security';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !token.trim() || !password) {
      setError('Email, token and new password are required');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    const pwd = validatePasswordStrength(password);
    if (!pwd.valid) {
      setError(pwd.errors[0]);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/reset-password', {
        email: email.trim().toLowerCase(),
        token: token.trim(),
        password,
        password_confirmation: confirm,
      });
      setDone(true);
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      setError(
        errors
          ? Object.values(errors).flat()[0]
          : err.response?.data?.message ?? 'Could not reset password',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.gray50, COLORS.gray100]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.content, { paddingTop: insets.top + SPACING.md }]}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.logo}>
              <Text style={styles.logoText}>T</Text>
            </LinearGradient>
          </View>
          <Text style={styles.title}>New Password</Text>
          <Text style={styles.subtitle}>
            Enter the token from your reset email and choose a new password.
          </Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!done ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="john@example.com"
                  placeholderTextColor={COLORS.gray400}
                  selectionColor={COLORS.primary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>RESET TOKEN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste token from email"
                  placeholderTextColor={COLORS.gray400}
                  selectionColor={COLORS.primary}
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8+ chars, upper/lower, number, symbol"
                  placeholderTextColor={COLORS.gray400}
                  selectionColor={COLORS.primary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat new password"
                  placeholderTextColor={COLORS.gray400}
                  selectionColor={COLORS.primary}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.buttonGradient}>
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>RESET PASSWORD</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.sentBox}>
              <Text style={styles.sentText}>
                Password reset successful! You can now sign in with your new password.
              </Text>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => navigation.navigate('Login')}
              >
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>GO TO SIGN IN</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Changed your mind? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: COLORS.white,
    fontSize: 38,
    fontWeight: '900',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 15,
    color: COLORS.dark,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  submitButton: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorText: {
    color: COLORS.rose,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  sentBox: {
    gap: SPACING.sm,
  },
  sentText: {
    fontSize: 13,
    color: COLORS.slate600,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.slate500,
    fontWeight: '500',
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});

export default ResetPasswordScreen;

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
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/security';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
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
            <LinearGradient 
              colors={[COLORS.primary, COLORS.primaryDark]} 
              style={styles.logo}
            >
              <Text style={styles.logoText}>T</Text>
            </LinearGradient>
          </View>
          <Text style={styles.title}>ToleMate</Text>
          <Text style={styles.subtitle}>Your Local Service Marketplace</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput 
              style={styles.input}
              placeholder="john@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <TextInput 
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.eyeToggle}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={8}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={COLORS.slate400}
                />
              </Pressable>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient 
              colors={[COLORS.primary, COLORS.primaryDark]} 
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>SIGN IN</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    marginBottom: SPACING.xxl,
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
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: COLORS.white,
    fontSize: 42,
    fontWeight: '900',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.dark,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.slate500,
    fontWeight: '500',
    marginTop: 4,
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
    marginBottom: SPACING.lg,
  },
  inputWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeToggle: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingRight: 44,
    fontSize: 15,
    color: COLORS.dark,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  loginButton: {
    marginTop: SPACING.md,
    borderRadius: 8,
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
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: 2,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
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

export default LoginScreen;

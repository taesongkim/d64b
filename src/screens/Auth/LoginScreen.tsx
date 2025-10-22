import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { isFeatureEnabled } from '@/config/features';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showTestLoginModal, setShowTestLoginModal] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async (): Promise<void> => {
    console.log('🔍 Login attempt started');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      setError('Please fill in all fields');
      return;
    }
    
    console.log('🔄 Setting loading state...');
    setLoading(true);
    setError(null);
    
    try {
      console.log('📞 Calling signIn function...');
      const { error } = await signIn(email.trim(), password);
      console.log('📥 SignIn response:', { error: error?.message || 'No error' });
      
      if (error) {
        console.log('❌ Login error:', error.message);
        if (error.message.includes('email not confirmed') || error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
          setShowResendConfirmation(true);
        } else {
          setError(error.message);
          setShowResendConfirmation(false);
        }
      } else {
        console.log('✅ Login successful!');
        setShowResendConfirmation(false);
      }
      // Navigation will happen automatically via AuthContext state change
    } catch (err) {
      console.log('💥 Unexpected error:', err);
      setError('An unexpected error occurred');
      setShowResendConfirmation(false);
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const handleResendConfirmation = async (): Promise<void> => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setResendLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        setError(`Failed to resend confirmation: ${error.message}`);
      } else {
        setError('Confirmation email sent! Please check your inbox.');
        setShowResendConfirmation(false);
      }
    } catch (err) {
      setError('Failed to resend confirmation email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSocialLogin = (provider: string): void => {
    console.log(`Login with ${provider}`);
    // TODO: Implement social login
  };

  const handleTestLogin = async (testUser: 'taesongkim' | 'shapes' | 'orikiri'): Promise<void> => {
    const credentials = {
      taesongkim: { email: 'justin@taesongkim.com', password: 'taes0ngA,' },
      shapes: { email: 'justin@shapeswithsoul.com', password: 'taes0ngA,' },
      orikiri: { email: 'justin@orikiri.com', password: 'taes0ngA,' },
    };

    const { email: testEmail, password: testPassword } = credentials[testUser];

    setShowTestLoginModal(false);
    setLoading(true);
    setError(null);

    try {
      const { error } = await signIn(testEmail, testPassword);
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Test login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>D64B</Text>
          <Text style={styles.tagline}>Track habits, build streaks</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, !showResendConfirmation && styles.errorTextOnly]}>
                {error}
              </Text>
              {showResendConfirmation && (
                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={handleResendConfirmation}
                  disabled={resendLoading}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : (
                    <Text style={styles.resendButtonText}>Resend Confirmation Email</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* MVP-HIDDEN: Social Authentication - Enable in v1.1 */}
          {isFeatureEnabled('SOCIAL_AUTH') && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('Google')}
                >
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('Apple')}
                >
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={styles.signupLink}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupLinkText}>
            New here? <Text style={styles.signupLinkBold}>Create account</Text>
          </Text>
        </TouchableOpacity>

        {/* Dev Mode Test Logins - Remove in production */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devBypassButton}
            onPress={() => setShowTestLoginModal(true)}
          >
            <Text style={styles.devBypassText}>Dev Mode: Test Logins</Text>
          </TouchableOpacity>
        )}

        {/* Test Login Modal */}
        <Modal
          visible={showTestLoginModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTestLoginModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Test User Logins</Text>

              <TouchableOpacity
                style={styles.testLoginButton}
                onPress={() => handleTestLogin('taesongkim')}
                disabled={loading}
              >
                <Text style={styles.testLoginButtonText}>taesongkim</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testLoginButton}
                onPress={() => handleTestLogin('shapes')}
                disabled={loading}
              >
                <Text style={styles.testLoginButtonText}>shapes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testLoginButton}
                onPress={() => handleTestLogin('orikiri')}
                disabled={loading}
              >
                <Text style={styles.testLoginButtonText}>orikiri</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTestLoginModal(false)}
                disabled={loading}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 42,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#111827',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loginButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Manrope_600SemiBold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 16,
    color: '#374151',
    fontFamily: 'Manrope_500Medium',
  },
  signupLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signupLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupLinkBold: {
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
    marginBottom: 8,
  },
  errorTextOnly: {
    marginBottom: 0,
  },
  resendButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  resendButtonText: {
    color: '#111827',
    fontSize: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  devBypassButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  devBypassText: {
    color: '#92400E',
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_600SemiBold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  testLoginButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  testLoginButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
  },
});
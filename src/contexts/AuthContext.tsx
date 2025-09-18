import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', { event, userId: session?.user?.id || 'No user' });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle sign in
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('👤 User signed in, checking profile...');
          // Check if profile exists, create if it doesn't
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          if (!profile) {
            console.log('📝 Creating new profile...');
            await createProfile(session.user);
          } else {
            console.log('✅ Profile already exists');
          }
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out, clearing state...');
          setUser(null);
          setSession(null);
          // Note: Dashboard will clear Redux data when user becomes null
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const createProfile = async (user: User): Promise<void> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          },
        ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 AuthContext signIn called with:', { email, passwordLength: password.length });
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('🔐 Supabase signIn result:', { error: error?.message || 'No error' });
    return { error };
  };

  const signOut = async () => {
    console.log('🚪 AuthContext signOut called');
    
    const { error } = await supabase.auth.signOut();
    
    console.log('🚪 Supabase signOut result:', { error: error?.message || 'No error' });
    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
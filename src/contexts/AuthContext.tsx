import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { generateUsernameSuggestion, checkUsernameAvailability } from '@/utils/usernameValidation';
import { store, persistor, logoutGlobal } from '@/store';
import { SyncService } from '@/services/syncService';
import { syncScheduler } from '@/services/syncScheduler';
import { purgeExpiredDeleted } from '@/store/slices/commitmentsSlice';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: AuthError | null }>;
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

          // Purge expired deleted commitments on app start
          store.dispatch(purgeExpiredDeleted());
          console.log('🧹 Purged expired deleted commitments');

          // Start periodic sync scheduler
          syncScheduler.start();
          console.log('🔄 Started sync scheduler');

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
          console.log('🔐 SIGNED_OUT → STOP_SYNC + LOGOUT_GLOBAL + PURGE');
          setUser(null);
          setSession(null);
          (async () => {
            try { SyncService.stop(); } catch (e) { console.warn('SyncService.stop failed', e); }
            try { syncScheduler.stop(); } catch (e) { console.warn('syncScheduler.stop failed', e); }
            try { store.dispatch(logoutGlobal()); } catch (e) { console.warn('logoutGlobal dispatch failed', e); }
            try { await persistor.purge(); } catch (e) { console.warn('persistor.purge failed', e); }
          })();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const createProfile = async (user: User): Promise<void> => {
    try {
      // Use provided username from signup or generate one if not provided
      let username = user.user_metadata?.username;
      
      if (!username) {
        // Fallback: generate a unique username for existing users
        username = generateUsernameSuggestion(
          user.email!, 
          user.user_metadata?.full_name
        );
      }
      
      // Ensure username is unique
      let counter = 1;
      let isAvailable = false;
      let finalUsername = username;
      
      while (!isAvailable) {
        const availability = await checkUsernameAvailability(finalUsername, supabase);
        if (availability.isAvailable) {
          isAvailable = true;
        } else {
          finalUsername = `${username}${counter}`;
          counter++;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email!,
            username: finalUsername, // Will be automatically lowercased by trigger
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          },
        ]);

      if (error) throw error;
      console.log('✅ Profile created successfully');
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 AuthContext signIn called');
    
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

    // Idempotent fallback if SIGNED_OUT event is delayed or missed
    (async () => {
      try { SyncService.stop(); } catch {}
      try { syncScheduler.stop(); } catch {}
      try { store.dispatch(logoutGlobal()); } catch {}
      try { await persistor.purge(); } catch {}
    })();

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
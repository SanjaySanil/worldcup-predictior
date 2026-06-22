import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isRole: (role: 'super_admin' | 'admin' | 'user') => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function ensureProfile(userId: string, username: string, displayName: string): Promise<void> {
  // Upsert profile — safe to call multiple times
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, username, display_name: displayName, role: 'user' },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  if (error) {
    // Try with a unique suffix if username is taken
    if (error.code === '23505') {
      const suffix = userId.replace(/-/g, '').slice(0, 6);
      await supabase
        .from('profiles')
        .upsert(
          { id: userId, username: `${username}_${suffix}`, display_name: displayName, role: 'user' },
          { onConflict: 'id', ignoreDuplicates: true }
        );
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setProfile(data);
      return data;
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          // If no profile exists (trigger may have failed), create one from available data
          if (!p) {
            const meta = session.user.user_metadata;
            const username = meta?.username || session.user.email?.split('@')[0] || 'user';
            await ensureProfile(session.user.id, username, meta?.display_name || username);
            await fetchProfile(session.user.id);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username, role: 'user' },
      },
    });

    if (error) return { error: error as Error };

    // needsConfirmation: user exists but no session yet (email confirm required)
    const needsConfirmation = !!data.user && !data.session;

    // Frontend fallback: ensure profile exists even if trigger failed
    if (data.user && data.session) {
      // Small delay to allow trigger to run first
      await new Promise(r => setTimeout(r, 600));
      const existing = await fetchProfile(data.user.id);
      if (!existing) {
        await ensureProfile(data.user.id, username, username);
        await fetchProfile(data.user.id);
      }
    }

    return { error: null, needsConfirmation };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isRole = (role: 'super_admin' | 'admin' | 'user') => profile?.role === role;
  const isAdmin = () => profile?.role === 'super_admin' || profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signIn, signUp, signOut, refreshProfile,
      isRole, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

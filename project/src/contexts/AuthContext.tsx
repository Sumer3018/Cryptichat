// src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Define the shape of your public profile data from the 'profiles' table
type Profile = {
  id: string;
  username: string;
  full_name: string;
  public_key: string; // Crucial for end-to-end encryption
};

// Define the shape of the value that the context will provide to the app
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  privateKey: string | null; // For decrypting messages
  loading: boolean;
  signOut: () => Promise<void>;
  checkProfile: () => Promise<void>; // ✅ added
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession?.user) {
          const user = currentSession.user;
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          setProfile(profileData || null);

          const storedPrivateKey = localStorage.getItem(`privateKey_${user.id}`);
          setPrivateKey(storedPrivateKey);
        }
      } catch (error) {
        console.error("Error fetching initial session data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (!newSession?.user) {
          setProfile(null);
          setPrivateKey(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (session?.user) {
      localStorage.removeItem(`privateKey_${session.user.id}`);
    }
    await supabase.auth.signOut();
  };

  // ✅ added checkProfile
  const checkProfile = async () => {
    if (!session?.user) return;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    setProfile(profileData || null);
  };
  
  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    privateKey,
    loading,
    signOut,
    checkProfile, // ✅ include here
  }), [session, profile, privateKey, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [effectiveRole, setEffectiveRole] = useState(null); // 'admin' | 'responsabile' | 'user'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  const loadProfile = async (userId) => {
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(p);

      // Calcola ruolo effettivo
      if (p?.role === 'admin') {
        setEffectiveRole('admin');
      } else {
        // Controlla se l'utente è responsabile di almeno un team
        const { data: teams } = await supabase.from('teams').select('responsabile_ids');
        const isResponsabile = (teams || []).some(
          (t) => Array.isArray(t.responsabile_ids) && t.responsabile_ids.includes(userId)
        );
        setEffectiveRole(isResponsabile ? 'responsabile' : 'user');
      }
    } catch (error) {
      console.error('Errore caricamento profilo:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        loadProfile(session.user.id);
      }
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setEffectiveRole(null);
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError({ type: 'login_failed', message: error.message });
      return { error };
    }
    return { data };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setEffectiveRole(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  // Helper utilizzabili in tutta l'app tramite useAuth()
  const isAdmin = effectiveRole === 'admin';
  const isResponsabile = effectiveRole === 'responsabile' || effectiveRole === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      effectiveRole,
      isAdmin,
      isResponsabile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      login,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
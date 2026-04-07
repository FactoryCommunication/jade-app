import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [effectiveRole, setEffectiveRole] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  const loadProfile = async (userId) => {
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(p);

      const { data: teams } = await supabase.from('teams').select('*');
      const allTeams = teams || [];

      if (p?.role === 'admin') {
        setEffectiveRole('admin');
      } else {
        const isResponsabile = allTeams.some(
          (t) => Array.isArray(t.responsabile_ids) && t.responsabile_ids.includes(userId)
        );
        setEffectiveRole(isResponsabile ? 'responsabile' : 'user');
      }

      const myTeams = allTeams.filter(
        (t) =>
          (Array.isArray(t.member_ids) && t.member_ids.includes(userId)) ||
          (Array.isArray(t.responsabile_ids) && t.responsabile_ids.includes(userId))
      );
      setUserTeams(myTeams);

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
          setUserTeams([]);
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Rileva quando la tab torna in foreground e verifica la sessione
  useEffect(() => {
    async function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) {
            window.location.href = '/login';
            return;
          }
          await supabase.auth.refreshSession();
        } catch (err) {
          console.error('Errore refresh sessione:', err);
          window.location.href = '/login';
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Keepalive: impedisce al browser di congelare la tab
  useEffect(() => {
    const keepAlive = setInterval(async () => {
      try {
        await supabase.auth.getSession();
      } catch {}
    }, 20000); // ogni 20 secondi
    return () => clearInterval(keepAlive);
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
    setUserTeams([]);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const isAdmin = effectiveRole === 'admin';
  const isResponsabile = effectiveRole === 'responsabile' || effectiveRole === 'admin';

  function isTeamMember(teamName) {
    if (isAdmin) return true;
    return userTeams.some(
      (t) => t.name?.toLowerCase() === teamName.toLowerCase()
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      effectiveRole,
      isAdmin,
      isResponsabile,
      isTeamMember,
      userTeams,
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
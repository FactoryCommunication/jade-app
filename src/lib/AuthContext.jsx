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

  // Ricarica la pagina solo se la tab era in background per più di 2 minuti
  useEffect(() => {
    let hiddenAt = null;
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        const elapsed = hiddenAt ? Date.now() - hiddenAt : 0;
        if (elapsed > 120000) { // 2 minuti
          window.location.reload();
        }
        hiddenAt = null;
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
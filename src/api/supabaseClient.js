import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});

// Se il lock si blocca, pulisce localStorage e ricarica
window.addEventListener('unhandledrejection', (event) => {
  if (event?.reason?.message?.includes('Lock') || 
      event?.reason?.message?.includes('lock')) {
    console.warn('Lock bloccato — pulizia e ricarica');
    const keys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'));
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }
});
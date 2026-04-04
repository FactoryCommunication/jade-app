import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { LanguageProvider } from '@/lib/i18n'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from './components/Layout';
import PMLayout from './components/PMLayout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import CRM from './pages/CRM';
import Vendite from './pages/Vendite';
import GestioneSEO from './pages/GestioneSEO';
import AdminPanel from './pages/admin/AdminPanel';
import Wiki from './pages/Wiki';
import Amministrazione from './pages/Amministrazione';
import Finanza from './pages/Finanza';
import Profile from './pages/Profile';
import Kanban from './pages/Kanban';
import Login from './pages/Login';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<PMLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/kanban" element={<Kanban />} />
        </Route>
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/vendite" element={<Vendite />} />
        <Route path="/seo" element={<GestioneSEO />} />
        <Route path="/amministrazione" element={<Amministrazione />} />
        <Route path="/finanza" element={<Finanza />} />
        <Route path="/wiki" element={<Wiki />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App

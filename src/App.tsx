import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MobileShell from './components/layout/MobileShell';
import LoginScreen from './pages/LoginScreen';

// Placeholders for routes we will create next
import LegacyBudgetEditor from './pages/LegacyBudgetEditor';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import BudgetsList from './pages/BudgetsList';
import MaterialsList from './pages/MaterialsList';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen bg-[#030712] flex justify-center items-center text-white font-bold animate-pulse">Carregando LVC...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginScreen />} />
      <Route path="/" element={<ProtectedRoute><MobileShell /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="orcamentos" element={<BudgetsList />} />
        <Route path="orcamento/novo" element={<LegacyBudgetEditor />} />
        <Route path="orcamento/:id" element={<LegacyBudgetEditor />} />
        <Route path="listas" element={<MaterialsList />} />
        <Route path="clientes" element={<ClientsList />} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

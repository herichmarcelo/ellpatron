import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthProvider from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { QueryProvider } from './contexts/QueryContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WhatsAppButton from './components/WhatsAppButton';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Atrasados from './pages/Atrasados';
import ListaClientes from './pages/ListaClientes';
import ListaNegra from './pages/ListaNegra';
import Historico from './pages/Historico';
import AdicionarCliente from './pages/AdicionarCliente';
import GerarContrato from './pages/GerarContrato';
import HistoricoContratos from './pages/HistoricoContratos';
import './App.css';

function AppLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const rawPath = location.pathname.replace(/^\//, '') || 'dashboard';
  const currentPage = rawPath === '' ? 'dashboard' : rawPath;

  const getPageTitle = (pageId) => {
    const titles = {
      dashboard: 'Dashboard',
      historico: 'Histórico',
      'adicionar-cliente': 'Adicionar Cliente',
      'lista-clientes': 'Lista de Clientes',
      'gerar-contrato': 'Gerar Contrato',
      'historico-contratos': 'Histórico de Contratos',
      atrasados: 'Atrasados',
      'lista-negra': 'Lista Negra',
    };
    return titles[pageId] || 'Ell Patron';
  };

  if (loading) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={handleSidebarClose}
        currentPage={currentPage}
      />
      
      <div className={`app-main ${sidebarOpen ? 'app-main--sidebar-open' : ''}`}>
        <Header 
          onMenuClick={handleMenuClick}
          title={getPageTitle(currentPage)}
        />
        
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/adicionar-cliente" element={<AdicionarCliente />} />
            <Route path="/lista-clientes" element={<ListaClientes />} />
            <Route path="/gerar-contrato" element={<GerarContrato />} />
            <Route path="/historico-contratos" element={<HistoricoContratos />} />
            <Route path="/atrasados" element={<Atrasados />} />
            <Route path="/lista-negra" element={<ListaNegra />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <WhatsAppButton />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <Router>
          <AppLayout />
        </Router>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
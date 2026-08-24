import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

function AppContent() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

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
    return titles[pageId] || 'EasierControl';
  };

  if (loading) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
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
              <Route path="/" element={<Dashboard onPageChange={setCurrentPage} />} />
              <Route path="/dashboard" element={<Dashboard onPageChange={setCurrentPage} />} />
              <Route path="/historico" element={<Historico onPageChange={setCurrentPage} />} />
              <Route path="/adicionar-cliente" element={<AdicionarCliente onPageChange={setCurrentPage} />} />
              <Route path="/lista-clientes" element={<ListaClientes onPageChange={setCurrentPage} />} />
              <Route path="/gerar-contrato" element={<GerarContrato onPageChange={setCurrentPage} />} />
              <Route path="/historico-contratos" element={<HistoricoContratos onPageChange={setCurrentPage} />} />
              <Route path="/atrasados" element={<Atrasados onPageChange={setCurrentPage} />} />
              <Route path="/lista-negra" element={<ListaNegra onPageChange={setCurrentPage} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <WhatsAppButton />
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, UserPlus, LayoutDashboard, Users, AlertCircle, Ban, Clock, FileText, List } from 'lucide-react';
import Badge from './Badge';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, currentPage }) => {
  const navigate = useNavigate();
  const [notifications] = useState({
    atrasados: 99
  });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'historico', label: 'Histórico', icon: BarChart3, path: '/historico' },
    { id: 'adicionar-cliente', label: 'Adicionar Cliente', icon: UserPlus, path: '/adicionar-cliente' },
    { id: 'lista-clientes', label: 'Lista de Clientes', icon: Users, path: '/lista-clientes' },
    { id: 'gerar-contrato', label: 'Gerar Contrato', icon: FileText, path: '/gerar-contrato' },
    { id: 'historico-contratos', label: 'Histórico Contratos', icon: List, path: '/historico-contratos' },
    { 
      id: 'atrasados', 
      label: 'Atrasados', 
      icon: AlertCircle, 
      path: '/atrasados',
      badge: notifications.atrasados > 0 ? notifications.atrasados : null,
      badgeVariant: 'red'
    },
    { id: 'lista-negra', label: 'Lista Negra', icon: Ban, path: '/lista-negra' },
  ];

  const handleMenuItemClick = (path) => {
    navigate(path);
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <>
      {/* Overlay for mobile - closes sidebar when clicked */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        {/* Logo Section */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/icons/ELLPATRON.png" alt="Ell Patron Logo" className="sidebar-logo-image" />
          </div>
        </div>

        {/* Date Display */}
        <div className="sidebar-date">
          <Clock size={14} />
          <span>{getCurrentDate()}</span>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <li key={item.id} className="sidebar-menu-item">
                  <button
                    className={`sidebar-menu-link ${isActive ? 'sidebar-menu-link--active' : ''}`}
                    onClick={() => handleMenuItemClick(item.path)}
                  >
                    <span className="sidebar-menu-icon">
                      <Icon size={18} />
                    </span>
                    <span className="sidebar-menu-text">{item.label}</span>
                    {item.badge && (
                      <Badge variant={item.badgeVariant} count={item.badge} className="sidebar-menu-badge" size="small" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              <span>AD</span>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Admin</span>
              <span className="sidebar-user-role">Administrador</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
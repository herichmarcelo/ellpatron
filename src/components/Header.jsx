import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, Bell, User, Search, Sparkles, X, LogOut, 
  CheckCircle2, AlertTriangle, Clock, FileText, 
  ChevronRight, ShieldCheck, RefreshCw, Layers,
  ArrowUpRight, ArrowDownLeft, ArrowRightLeft, PiggyBank
} from 'lucide-react';
import Badge from './Badge';
import { useAuth } from '../contexts/useAuth';
import { getContracts, getPayments, getSavingsTransactions, getClients } from '../supabase/services.js';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculateOverduePenalties, calculateUpdatedTotal } from '../utils/calculations';
import './Header.css';

const Header = ({ onMenuClick, title }) => {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'overdue', 'today', 'payment', 'contract', 'savings'
  const [searchTerm, setSearchTerm] = useState('');
  
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [savingsList, setSavingsList] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [loadingLogs, setLoadingLogs] = useState(false);

  const profileMenuRef = useRef(null);

  // Carregar dados de contratos, pagamentos e aportes
  const loadLogsData = async () => {
    setLoadingLogs(true);
    try {
      const [contractsRes, paymentsRes, savingsRes, clientsRes] = await Promise.all([
        getContracts(),
        getPayments(),
        getSavingsTransactions(),
        getClients()
      ]);
      if (contractsRes.success) setContracts(contractsRes.data || []);
      if (paymentsRes.success) setPayments(paymentsRes.data || []);
      if (savingsRes.success) setSavingsList(savingsRes.data || []);
      if (clientsRes.success) {
        const cMap = {};
        (clientsRes.data || []).forEach(c => {
          cMap[c.id] = c.name;
        });
        setClientsMap(cMap);
      }
    } catch (err) {
      console.error('Error fetching logs for header:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const [contractsRes, paymentsRes, savingsRes, clientsRes] = await Promise.all([
          getContracts(),
          getPayments(),
          getSavingsTransactions(),
          getClients()
        ]);
        if (isMounted) {
          if (contractsRes.success) setContracts(contractsRes.data || []);
          if (paymentsRes.success) setPayments(paymentsRes.data || []);
          if (savingsRes.success) setSavingsList(savingsRes.data || []);
          if (clientsRes.success) {
            const cMap = {};
            (clientsRes.data || []).forEach(c => {
              cMap[c.id] = c.name;
            });
            setClientsMap(cMap);
          }
        }
      } catch (err) {
        console.error('Error fetching logs for header:', err);
      }
    };

    fetchInitial();
    const interval = setInterval(loadLogsData, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fechar menu de perfil ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  // Processamento e Classificação dos Logs
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = new Date().toISOString().split('T')[0];

  const logItems = [];

  // 1. Contratos em Atraso (Vermelho) & Vencendo Hoje (Amarelo)
  contracts.forEach(contract => {
    if (contract.status === 'paid') return;
    
    const dueDate = new Date(contract.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const dueDateStr = contract.due_date ? new Date(contract.due_date).toISOString().split('T')[0] : '';
    
    const isToday = dueDateStr === todayStr || dueDate.getTime() === today.getTime();
    const isOverdue = dueDate < today && !isToday;

    if (isToday) {
      logItems.push({
        id: `today-${contract.id}`,
        type: 'today',
        title: 'Parcela Vencendo Hoje',
        clientName: contract.client_name || 'Cliente',
        protocol: contract.protocol_number,
        amount: contract.monthly_installment || contract.principal,
        date: contract.due_date,
        badgeText: 'VENCE HOJE',
        badgeType: 'yellow',
        details: `${contract.installments_count || contract.installments || 1}x de ${formatCurrency(contract.monthly_installment || contract.principal)}`,
        timestamp: dueDate.getTime()
      });
    } else if (isOverdue) {
      const diffTime = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      const penalties = calculateOverduePenalties(
        contract.monthly_installment || contract.principal,
        contract.late_fee_percentage || contract.penalty_rate || 10,
        contract.daily_late_interest_percentage || contract.daily_interest_rate || 1,
        daysOverdue
      );
      const totalUpdated = calculateUpdatedTotal(
        contract.monthly_installment || contract.principal,
        penalties.multaValor,
        penalties.jurosDiariosValor
      );

      logItems.push({
        id: `overdue-${contract.id}`,
        type: 'overdue',
        title: 'Parcela em Atraso',
        clientName: contract.client_name || 'Cliente',
        protocol: contract.protocol_number,
        amount: totalUpdated,
        originalAmount: contract.monthly_installment || contract.principal,
        daysOverdue,
        date: contract.due_date,
        badgeText: `${daysOverdue}d em atraso`,
        badgeType: 'red',
        details: `Multa (+${formatCurrency(penalties.multaValor)}) • Juros (+${formatCurrency(penalties.jurosDiariosValor)})`,
        timestamp: dueDate.getTime()
      });
    }
  });

  // 2. Pagamentos Realizados (Verde)
  payments.forEach(p => {
    logItems.push({
      id: `payment-${p.id}`,
      type: 'payment',
      title: 'Pagamento Realizado',
      clientName: p.client_name || `Contrato #${p.contract_protocol || ''}`,
      protocol: p.contract_protocol,
      amount: p.amount,
      date: p.payment_date || p.created_at,
      badgeText: 'BAIXA RECEBIDA',
      badgeType: 'green',
      details: `Parcela ${p.installment_number || 1} • Forma: ${(p.payment_method || 'PIX').toUpperCase()}`,
      timestamp: new Date(p.payment_date || p.created_at).getTime()
    });
  });

  // 3. Novos Empréstimos Gerados (Roxo)
  contracts.forEach(contract => {
    logItems.push({
      id: `new-contract-${contract.id}`,
      type: 'contract',
      title: 'Empréstimo Gerado',
      clientName: contract.client_name || 'Cliente',
      protocol: contract.protocol_number,
      amount: contract.principal,
      totalAmount: contract.total_amount || contract.total_original || contract.principal,
      date: contract.loan_date || contract.created_at,
      badgeText: 'NOVO CONTRATO',
      badgeType: 'purple',
      details: `${contract.installments_count || contract.installments || 1}x de ${formatCurrency(contract.monthly_installment || contract.principal)}`,
      timestamp: new Date(contract.loan_date || contract.created_at).getTime()
    });
  });

  // 4. Aportes e Resgates da Carteira (Feed de Aportes/Saques)
  savingsList.forEach(s => {
    const clientName = clientsMap[s.client_id] || s.client_name || 'Cliente';
    const isDep = s.type === 'deposit';
    const isWith = s.type === 'withdrawal';
    const isInterest = s.type === 'interest';

    if (isDep) {
      logItems.push({
        id: `savings-dep-${s.id}`,
        type: 'savings',
        savingsType: 'deposit',
        title: `+${formatCurrency(s.amount)} de ${clientName}`,
        clientName: clientName,
        amount: s.amount,
        date: s.transaction_date || s.created_at,
        badgeText: 'APORTE',
        badgeType: 'green',
        iconType: 'deposit',
        details: `Aporte em Carteira • Forma: ${(s.payment_method || 'PIX').toUpperCase()}${Number(s.interest_rate_month) > 0 ? ` • ${s.interest_rate_month}% a.m.` : ''}`,
        timestamp: new Date(s.transaction_date || s.created_at).getTime()
      });
    } else if (isWith) {
      logItems.push({
        id: `savings-with-${s.id}`,
        type: 'savings',
        savingsType: 'withdrawal',
        title: `-${formatCurrency(s.amount)} de ${clientName}`,
        clientName: clientName,
        amount: s.amount,
        date: s.transaction_date || s.created_at,
        badgeText: 'RESGATE',
        badgeType: 'red',
        iconType: 'withdrawal',
        details: `Saque efetuado • Forma: ${(s.payment_method || 'PIX').toUpperCase()}${s.notes ? ` • ${s.notes}` : ''}`,
        timestamp: new Date(s.transaction_date || s.created_at).getTime()
      });
    } else if (isInterest) {
      logItems.push({
        id: `savings-int-${s.id}`,
        type: 'savings',
        savingsType: 'interest',
        title: `+${formatCurrency(s.amount)} (Rendimento) de ${clientName}`,
        clientName: clientName,
        amount: s.amount,
        date: s.transaction_date || s.created_at,
        badgeText: 'RENDIMENTO',
        badgeType: 'gold',
        iconType: 'interest',
        details: `Rendimento automático de poupança creditado`,
        timestamp: new Date(s.transaction_date || s.created_at).getTime()
      });
    }
  });

  // Ordenar logs: Mais recentes e urgentes primeiro
  logItems.sort((a, b) => b.timestamp - a.timestamp);

  // Contagem de alertas urgentes
  const urgentCount = logItems.filter(item => item.type === 'overdue' || item.type === 'today').length;
  const overdueCount = logItems.filter(item => item.type === 'overdue').length;
  const todayCount = logItems.filter(item => item.type === 'today').length;
  const paymentCount = logItems.filter(item => item.type === 'payment').length;
  const contractCount = logItems.filter(item => item.type === 'contract').length;
  const savingsCount = logItems.filter(item => item.type === 'savings').length;

  // Filtragem por Tab e Busca
  const filteredLogs = logItems.filter(item => {
    if (activeTab !== 'all' && item.type !== activeTab) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.clientName.toLowerCase().includes(q) ||
        (item.protocol && item.protocol.toLowerCase().includes(q)) ||
        item.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getUserDisplayName = () => {
    return userProfile?.name || user?.email?.split('@')[0] || 'Administrador';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="header-menu-btn" onClick={onMenuClick} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="header-title-wrapper">
            <Sparkles size={16} className="header-title-icon" />
            <h1 className="header-title">{title}</h1>
          </div>
        </div>

        <div className="header-right">
          <div className="header-search">
            <Search size={16} className="header-search-icon" />
            <input
              type="text"
              placeholder="Buscar..."
              className="header-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowNotificationsModal(true)}
            />
          </div>

          {/* Botão de Notificações / Sino com Contagem Dinâmica */}
          <button 
            className="header-action-btn" 
            aria-label="Notificações e Alertas"
            onClick={() => {
              setShowNotificationsModal(true);
              setShowProfileMenu(false);
              loadLogsData();
            }}
          >
            <Bell size={18} />
            {urgentCount > 0 && (
              <Badge variant="red" count={urgentCount} className="header-action-badge" />
            )}
          </button>

          {/* Botão de Perfil / Boneco */}
          <div className="header-profile-container" ref={profileMenuRef}>
            <button 
              className="header-action-btn header-profile-btn" 
              aria-label="Menu de Perfil"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotificationsModal(false);
              }}
            >
              <User size={18} />
            </button>

            {/* Menu Dropdown de Perfil */}
            {showProfileMenu && (
              <div className="header-profile-dropdown">
                <div className="header-profile-dropdown-header">
                  <div className="header-profile-avatar-large">
                    {getUserInitials()}
                  </div>
                  <div className="header-profile-info-text">
                    <span className="header-profile-name">{getUserDisplayName()}</span>
                    <span className="header-profile-email">{user?.email || 'admin@ellpatron.com'}</span>
                    <span className="header-profile-badge">
                      <ShieldCheck size={12} /> {userProfile?.role === 'admin' ? 'Administrador' : 'Operador'}
                    </span>
                  </div>
                </div>

                <div className="header-profile-divider" />

                <div className="header-profile-links">
                  <button 
                    className="header-profile-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/dashboard');
                    }}
                  >
                    <Sparkles size={16} color="#EAB308" />
                    <span>Painel Geral</span>
                  </button>

                  <button 
                    className="header-profile-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowNotificationsModal(true);
                      loadLogsData();
                    }}
                  >
                    <Bell size={16} color="#3B82F6" />
                    <span>Central de Alertas & Logs</span>
                    {urgentCount > 0 && <span className="header-menu-pill red">{urgentCount}</span>}
                  </button>
                </div>

                <div className="header-profile-divider" />

                <div className="header-profile-footer">
                  <button className="header-logout-btn" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Sair da Conta (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Central de Alertas e Log do Sistema (Estilo C6 Carbon / Fullscreen Mobile) */}
      {showNotificationsModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationsModal(false)}>
          <div className="c6-modal-content c6-modal-large header-logs-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* Cabeçalho do Modal de Logs */}
            <div className="c6-modal-header">
              <div className="c6-header-titles">
                <h2 className="c6-title">Central de Alertas & Log do Sistema</h2>
                <span className="c6-subtitle">
                  {urgentCount} alerta(s) de atenção no momento
                </span>
              </div>
              <div className="header-modal-actions-top">
                <button 
                  className="header-refresh-btn" 
                  onClick={loadLogsData} 
                  title="Atualizar Logs"
                  disabled={loadingLogs}
                >
                  <RefreshCw size={16} className={loadingLogs ? 'spinning' : ''} />
                </button>
                <button className="c6-close-btn" onClick={() => setShowNotificationsModal(false)} aria-label="Fechar">
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Abas e Filtros de Cores */}
            <div className="header-logs-tabs-bar">
              <button 
                className={`header-log-tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <Layers size={14} /> Todos ({logItems.length})
              </button>
              <button 
                className={`header-log-tab tab-savings ${activeTab === 'savings' ? 'active' : ''}`}
                onClick={() => setActiveTab('savings')}
              >
                <span className="tab-dot green" /> Aportes ({savingsCount})
              </button>
              <button 
                className={`header-log-tab tab-red ${activeTab === 'overdue' ? 'active' : ''}`}
                onClick={() => setActiveTab('overdue')}
              >
                <span className="tab-dot red" /> Atrasados ({overdueCount})
              </button>
              <button 
                className={`header-log-tab tab-yellow ${activeTab === 'today' ? 'active' : ''}`}
                onClick={() => setActiveTab('today')}
              >
                <span className="tab-dot yellow" /> Vencem Hoje ({todayCount})
              </button>
              <button 
                className={`header-log-tab tab-green ${activeTab === 'payment' ? 'active' : ''}`}
                onClick={() => setActiveTab('payment')}
              >
                <span className="tab-dot green" /> Pagos ({paymentCount})
              </button>
              <button 
                className={`header-log-tab tab-purple ${activeTab === 'contract' ? 'active' : ''}`}
                onClick={() => setActiveTab('contract')}
              >
                <span className="tab-dot purple" /> Novos ({contractCount})
              </button>
            </div>

            {/* Barra de Busca Dentro do Modal */}
            <div className="header-logs-search-wrapper">
              <Search size={16} color="#737380" />
              <input 
                type="text" 
                placeholder="Filtrar por cliente, protocolo ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="header-logs-search-input"
              />
              {searchTerm && (
                <button className="header-logs-clear-search" onClick={() => setSearchTerm('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Corpo com a Lista de Logs Dinâmicos */}
            <div className="header-logs-body">
              {filteredLogs.length === 0 ? (
                <div className="c6-empty-state">
                  <Bell size={32} color="#737380" />
                  <p className="c6-empty-text">Nenhum registro encontrado nesta categoria.</p>
                  <span className="c6-empty-subtext">Todas as movimentações e alertas do sistema aparecem aqui.</span>
                </div>
              ) : (
                <div className="header-logs-list">
                  {filteredLogs.map((log) => {
                    const isRed = log.badgeType === 'red';
                    const isYellow = log.badgeType === 'yellow';
                    const isGreen = log.badgeType === 'green';
                    const isPurple = log.badgeType === 'purple';
                    const isGold = log.badgeType === 'gold';

                    return (
                      <div 
                        key={log.id} 
                        className={`header-log-card header-log-card--${log.badgeType}`}
                        onClick={() => {
                          setShowNotificationsModal(false);
                          if (log.type === 'overdue') navigate('/atrasados');
                          else if (log.type === 'contract') navigate('/historico-contratos');
                          else if (log.type === 'savings') navigate('/lista-aportes');
                          else navigate('/lista-clientes');
                        }}
                      >
                        {/* Ícone de Status Lateral */}
                        <div className={`header-log-icon-wrap icon-${log.badgeType}`}>
                          {log.iconType === 'deposit' && <ArrowUpRight size={18} />}
                          {log.iconType === 'withdrawal' && <ArrowDownLeft size={18} />}
                          {log.iconType === 'interest' && <PiggyBank size={18} />}
                          {!log.iconType && isRed && <AlertTriangle size={18} />}
                          {!log.iconType && isYellow && <Clock size={18} />}
                          {!log.iconType && isGreen && <CheckCircle2 size={18} />}
                          {!log.iconType && isPurple && <FileText size={18} />}
                        </div>

                        {/* Conteúdo Central do Log */}
                        <div className="header-log-content">
                          <div className="header-log-row-top">
                            <span className="header-log-client-name">{log.clientName}</span>
                            <span className={`header-log-badge badge-${log.badgeType}`}>
                              {log.badgeText}
                            </span>
                          </div>

                          <div className="header-log-title-row">
                            <span className="header-log-title-text">{log.title}</span>
                            {log.protocol && <span className="header-log-proto">#{log.protocol}</span>}
                          </div>

                          <div className="header-log-details">
                            {log.details}
                          </div>

                          <div className="header-log-row-bottom">
                            <span className="header-log-date">
                              <Clock size={12} /> {formatDate(log.date)}
                            </span>
                            <span className={`header-log-amount amount-${log.badgeType}`}>
                              {log.iconType === 'deposit' ? `+${formatCurrency(log.amount)}` : log.iconType === 'withdrawal' ? `-${formatCurrency(log.amount)}` : formatCurrency(log.amount)}
                            </span>
                          </div>
                        </div>

                        {/* Seta de Ação */}
                        <div className="header-log-action-arrow">
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé Informativo */}
            <div className="header-logs-footer">
              <span className="header-logs-legend">
                🟢 Aporte • 🔴 Resgate • 🟡 Vence Hoje • 🔴 Atrasado • 🟣 Empréstimo
              </span>
              <button 
                className="header-logs-cta-btn"
                onClick={() => {
                  setShowNotificationsModal(false);
                  navigate('/lista-aportes');
                }}
              >
                Ver Extrato de Aportes <ChevronRight size={16} />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Header;
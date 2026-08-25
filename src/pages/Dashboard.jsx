import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  UserPlus, 
  AlertTriangle, 
  TrendingUp, 
  Wallet,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import Card from '../components/Card';
import { formatCurrency } from '../utils/formatters';
import { getContracts, getClients } from '../supabase/services.js';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getContracts(), getClients()])
      .then(([contractsResult, clientsResult]) => {
        if (!isMounted) return;
        if (contractsResult.success) {
          setContracts(contractsResult.data || []);
        }
        if (clientsResult.success) {
          setClients(clientsResult.data || []);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading dashboard data:', error);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Lógica Financeira Aprimorada (Foco em Lucro x Risco)
  const totalInvested = contracts.reduce((sum, contract) => sum + (Number(contract.principal) || 0), 0);
  const expectedRevenue = contracts.reduce((sum, contract) => sum + (Number(contract.monthly_installment) || 0), 0);
  
  // Calcula valores e quantidades em atraso
  const overdueContractsList = contracts.filter(c => {
    const dueDate = new Date(c.due_date);
    return dueDate < new Date() && c.status === 'open';
  });
  
  const overdueContractsCount = overdueContractsList.length;
  const overdueValue = overdueContractsList.reduce((sum, c) => sum + (Number(c.monthly_installment) || Number(c.principal) || 0), 0);
  
  // Lucro líquido / Receita Real do mês (Esperado - Atrasado)
  const netRevenue = Math.max(0, expectedRevenue - overdueValue);
  const activeContracts = contracts.filter(c => c.status === 'open').length;

  // Formatação gramatical correta
  const activeContractsLabel = activeContracts === 1 ? '1 contrato ativo' : `${activeContracts} contratos ativos`;
  const overdueContractsLabel = overdueContractsCount === 1 ? '1 em atraso' : `${overdueContractsCount} em atraso`;

  // Calcula porcentagem para a barra de saúde
  const healthyPercentage = expectedRevenue > 0 ? Number(((netRevenue / expectedRevenue) * 100).toFixed(1)) : 100;
  const riskPercentage = expectedRevenue > 0 ? Number(((overdueValue / expectedRevenue) * 100).toFixed(1)) : 0;

  const handleMonthChange = (direction) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setSelectedMonth(newMonth);
  };

  const renderValue = (val) => {
    if (isBalanceHidden) return '••••••';
    return formatCurrency(val);
  };

  return (
    <div className="c6-dashboard">
      {/* C6 Top Bar: User Profile, Eye Toggle & Period Selector */}
      <div className="c6-header">
        <div className="c6-user-profile">
          <div className="c6-avatar">EP</div>
          <div className="c6-user-meta">
            <span className="c6-greeting">Olá, Ell Patron</span>
            <span className="c6-account-type">Gestão de Crédito</span>
          </div>
        </div>

        <div className="c6-header-controls">
          {/* Eye Hide/Show Balance Toggle */}
          <button 
            className="c6-icon-btn" 
            onClick={() => setIsBalanceHidden(!isBalanceHidden)}
            title={isBalanceHidden ? "Mostrar valores" : "Ocultar valores"}
            aria-label="Toggle balance visibility"
          >
            {isBalanceHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          {/* C6 Month Pill */}
          <div className="c6-month-pill">
            <button 
              className="c6-month-arrow" 
              onClick={() => handleMonthChange(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="c6-month-text">
              {selectedMonth.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </span>
            <button 
              className="c6-month-arrow" 
              onClick={() => handleMonthChange(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* C6 SALDOS SECTION (Grid 2x2 com visual de cartões bancários de alta legibilidade) */}
      <div className="c6-section-header">
        <h3 className="c6-section-title">Saldos & Métricas</h3>
        <button 
          className="c6-link-btn" 
          onClick={() => navigate('/historico')}
        >
          Extrato completo <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="c6-saldos-grid">
        {/* Card 1: Receita Real (Em Caixa) */}
        <div className="c6-balance-card c6-balance-card--green" onClick={() => navigate('/historico')}>
          <div className="c6-card-header">
            <div className="c6-icon-wrapper c6-icon-wrapper--green">
              <Wallet size={15} />
            </div>
            <span className="c6-card-title">Receita Real (Lucro)</span>
          </div>
          
          <div className="c6-card-body">
            <h3 className="c6-card-value">{renderValue(netRevenue)}</h3>
          </div>
          
          <div className="c6-card-footer">
            <span className="c6-badge c6-badge--green">Em Caixa</span>
            <span className="c6-action-link">
              Detalhes <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 2: Faturamento Esperado */}
        <div className="c6-balance-card c6-balance-card--blue" onClick={() => navigate('/historico-contratos')}>
          <div className="c6-card-header">
            <div className="c6-icon-wrapper c6-icon-wrapper--blue">
              <TrendingUp size={15} />
            </div>
            <span className="c6-card-title">Faturamento Esperado</span>
          </div>
          
          <div className="c6-card-body">
            <h3 className="c6-card-value">{renderValue(expectedRevenue)}</h3>
          </div>
          
          <div className="c6-card-footer">
            <span className="c6-badge c6-badge--blue">Total do Mês</span>
            <span className="c6-action-link">
              Projeção <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 3: Risco / Atrasos */}
        <div className="c6-balance-card c6-balance-card--red" onClick={() => navigate('/atrasados')}>
          <div className="c6-card-header">
            <div className="c6-icon-wrapper c6-icon-wrapper--red">
              <AlertTriangle size={15} />
            </div>
            <span className="c6-card-title">Risco / Atrasos</span>
          </div>
          
          <div className="c6-card-body">
            <h3 className="c6-card-value">{renderValue(overdueValue)}</h3>
          </div>
          
          <div className="c6-card-footer">
            <span className={`c6-badge ${overdueContractsCount > 0 ? 'c6-badge--red' : 'c6-badge--muted'}`}>
              {overdueContractsLabel}
            </span>
            <span className="c6-action-link">
              Cobrar <ArrowRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Total na Rua (Capital) */}
        <div className="c6-balance-card c6-balance-card--gold" onClick={() => navigate('/historico-contratos')}>
          <div className="c6-card-header">
            <div className="c6-icon-wrapper c6-icon-wrapper--gold">
              <DollarSign size={15} />
            </div>
            <span className="c6-card-title">Total na Rua</span>
          </div>
          
          <div className="c6-card-body">
            <h3 className="c6-card-value">{renderValue(totalInvested)}</h3>
          </div>
          
          <div className="c6-card-footer">
            <span className="c6-badge c6-badge--gold">
              {activeContractsLabel}
            </span>
            <span className="c6-action-link">
              Carteira <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* C6 AÇÕES RÁPIDAS (Quick Actions estilo C6 Bank) */}
      <div className="c6-section-header">
        <h3 className="c6-section-title">Ações rápidas</h3>
      </div>

      <div className="c6-quick-actions">
        <button className="c6-action-item" onClick={() => navigate('/gerar-contrato')}>
          <div className="c6-action-icon c6-action-icon--gold">
            <Plus size={20} />
          </div>
          <span className="c6-action-text">Novo Contrato</span>
        </button>

        <button className="c6-action-item" onClick={() => navigate('/adicionar-cliente')}>
          <div className="c6-action-icon">
            <UserPlus size={20} />
          </div>
          <span className="c6-action-text">Novo Cliente</span>
        </button>

        <button className="c6-action-item" onClick={() => navigate('/atrasados')}>
          <div className="c6-action-icon c6-action-icon--red">
            <AlertTriangle size={20} />
          </div>
          <span className="c6-action-text">Cobranças</span>
        </button>

        <button className="c6-action-item" onClick={() => navigate('/historico')}>
          <div className="c6-action-icon c6-action-icon--green">
            <TrendingUp size={20} />
          </div>
          <span className="c6-action-text">Relatórios</span>
        </button>
      </div>

      {/* C6 SAÚDE FINANCEIRA / RENTABILIDADE (Banner C6 Invest) */}
      {!loading && contracts.length > 0 && (
        <div className="c6-health-card">
          <div className="c6-health-header">
            <div className="c6-health-title-group">
              <ShieldCheck size={18} className="c6-health-icon" />
              <div>
                <span className="c6-health-title">Saúde da Carteira</span>
                <span className="c6-health-subtitle">Índice de adimplência do mês</span>
              </div>
            </div>
            <div className="c6-health-score">
              <span className="c6-score-number">{healthyPercentage}%</span>
              <span className="c6-score-tag">Saudável</span>
            </div>
          </div>

          <div className="c6-health-progress-bar">
            <div 
              className="c6-health-bar-fill c6-health-bar-fill--good" 
              style={{ width: `${healthyPercentage}%` }}
            ></div>
            <div 
              className="c6-health-bar-fill c6-health-bar-fill--bad" 
              style={{ width: `${riskPercentage}%` }}
            ></div>
          </div>

          <div className="c6-health-footer">
            <div className="c6-health-stat">
              <span className="c6-health-stat-label">Em dia:</span>
              <span className="c6-health-stat-val text-green">{renderValue(netRevenue)}</span>
            </div>
            <div className="c6-health-stat">
              <span className="c6-health-stat-label">Risco:</span>
              <span className="c6-health-stat-val text-red">{renderValue(overdueValue)}</span>
            </div>
          </div>
        </div>
      )}

      {/* C6 BLACK CARD BANNER (DESTAQUE ELL PATRON) */}
      <div className="c6-banner-card">
        <div className="c6-banner-content">
          <div className="c6-banner-tag">ELL PATRON CARBON</div>
          <h4 className="c6-banner-title">Gerador Oficial de Contratos</h4>
          <p className="c6-banner-desc">Emita instrumentos de mútuo com juros, multas e assinatura jurídica em PDF.</p>
        </div>
        <button 
          className="c6-c7-btn"
          onClick={() => navigate('/gerar-contrato')}
        >
          Criar Contrato
        </button>
      </div>

      {/* Empty State */}
      {!loading && clients.length === 0 && (
        <Card className="c6-empty-state">
          <div className="c6-empty-content">
            <div className="c6-empty-icon">
              <Sparkles size={40} />
            </div>
            <h3 className="c6-empty-title">Comece a operar no Ell Patron</h3>
            <p className="c6-empty-description">
              Cadastre seu primeiro cliente para iniciar a emissão de contratos e controle de parcelas.
            </p>
            <button 
              className="c6-primary-btn" 
              onClick={() => navigate('/adicionar-cliente')}
            >
              <UserPlus size={16} /> Adicionar Primeiro Cliente
            </button>
          </div>
        </Card>
      )}

      {/* C6 RECENT TRANSACTIONS / CONTRATOS */}
      {contracts.length > 0 && (
        <div className="c6-recent-section">
          <div className="c6-section-header">
            <h3 className="c6-section-title">Últimas Atividades</h3>
            <button 
              className="c6-link-btn" 
              onClick={() => navigate('/historico-contratos')}
            >
              Ver todos ({contracts.length}) <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="c6-transactions-list">
            {contracts.slice(0, 5).map(contract => {
              const isOverdue = new Date(contract.due_date) < new Date() && contract.status === 'open';
              const installmentsTotal = contract.installments_count || contract.installments || 1;
              const initials = (contract.client_name || 'CL').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

              return (
                <div 
                  key={contract.id} 
                  className={`c6-transaction-item ${isOverdue ? 'c6-transaction-item--overdue' : ''}`}
                  onClick={() => navigate('/historico-contratos')}
                >
                  <div className="c6-transaction-left">
                    <div className={`c6-tx-avatar ${isOverdue ? 'c6-tx-avatar--overdue' : ''}`}>
                      {initials}
                    </div>
                    <div className="c6-tx-info">
                      <p className="c6-tx-name">{contract.client_name}</p>
                      <p className="c6-tx-details">
                        {contract.protocol_number} • {installmentsTotal}x de {renderValue(contract.monthly_installment || contract.principal)}
                      </p>
                    </div>
                  </div>

                  <div className="c6-transaction-right">
                    <span className={`c6-tx-amount ${isOverdue ? 'text-red' : contract.status === 'paid' ? 'text-green' : 'text-gold'}`}>
                      {renderValue(contract.total_amount || contract.principal)}
                    </span>
                    <span className={`c6-status-pill ${isOverdue ? 'c6-status-pill--red' : contract.status === 'paid' ? 'c6-status-pill--green' : 'c6-status-pill--gold'}`}>
                      {contract.status === 'paid' ? 'Quitado' : isOverdue ? 'Atrasado' : 'Em Dia'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
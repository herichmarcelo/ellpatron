import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Users, Calendar, DollarSign, ArrowRight, Plus, Sparkles, FileText } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getContracts } from '../supabase/services.js';
import { getClients } from '../supabase/services.js';
import './Dashboard.css';

const Dashboard = ({ onPageChange }) => {
  React.useEffect(() => {
    if (onPageChange) onPageChange('dashboard');
  }, [onPageChange]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contractsResult, clientsResult] = await Promise.all([
        getContracts(),
        getClients()
      ]);

      if (contractsResult.success) {
        setContracts(contractsResult.data || []);
      }

      if (clientsResult.success) {
        setClients(clientsResult.data || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalInvested = contracts.reduce((sum, contract) => sum + (contract.principal || 0), 0);
  const monthlyRevenue = contracts.reduce((sum, contract) => sum + (contract.monthly_installment || 0), 0);
  const activeContracts = contracts.filter(c => c.status === 'open').length;
  const overdueContracts = contracts.filter(c => {
    const dueDate = new Date(c.due_date);
    return dueDate < new Date() && c.status === 'open';
  }).length;

  const financialCards = [
    {
      title: 'Valor Total Investido',
      value: formatCurrency(totalInvested),
      icon: DollarSign,
      trend: activeContracts > 0 ? '+' + activeContracts : '0%',
      trendUp: true,
      color: 'gold'
    },
    {
      title: 'Faturamento Mensal',
      value: formatCurrency(monthlyRevenue),
      icon: TrendingUp,
      trend: '0%',
      trendUp: true,
      color: 'green'
    },
    {
      title: 'Contratos Ativos',
      value: activeContracts.toString(),
      icon: FileText,
      trend: '0%',
      trendUp: true,
      color: 'blue'
    },
    {
      title: 'Em Atraso',
      value: overdueContracts.toString(),
      icon: AlertCircle,
      trend: overdueContracts > 0 ? '!' : '0%',
      trendUp: false,
      color: 'red'
    }
  ];

  const handleMonthChange = (direction) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setSelectedMonth(newMonth);
  };

  return (
    <div className="dashboard">
      {/* Month Selector */}
      <div className="dashboard-header">
        <Button
          variant="ghost"
          icon={ArrowRight}
          iconPosition="left"
          onClick={() => handleMonthChange(-1)}
        >
          ←
        </Button>
        <h2 className="dashboard-month">
          {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h2>
        <Button
          variant="ghost"
          icon={ArrowRight}
          onClick={() => handleMonthChange(1)}
        >
          →
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="dashboard-grid">
        {financialCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="dashboard-card">
              <div className="dashboard-card-header">
                <div className={`dashboard-card-icon dashboard-card-icon--${card.color}`}>
                  <Icon size={24} />
                </div>
                <div className="dashboard-card-trend">
                  <span className={card.trendUp ? 'trend-up' : 'trend-down'}>
                    {card.trend}
                  </span>
                </div>
              </div>
              <h3 className="dashboard-card-title">{card.title}</h3>
              <p className="dashboard-card-value">{card.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Empty State - Start Using System */}
      {!loading && clients.length === 0 && (
        <Card className="dashboard-empty-state">
          <div className="dashboard-empty-content">
            <div className="dashboard-empty-icon">
              <Sparkles size={48} />
            </div>
            <h3 className="dashboard-empty-title">Comece a usar o sistema</h3>
            <p className="dashboard-empty-description">
              Adicione seu primeiro cliente para começar a gerenciar seu sistema
            </p>
            <Button 
              variant="primary" 
              className="dashboard-empty-btn"
              icon={Plus}
            >
              Adicionar Primeiro Cliente
            </Button>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="dashboard-quick-stats">
        <Card className="dashboard-stat-card">
          <div className="dashboard-stat-content">
            <Users size={20} className="dashboard-stat-icon" />
            <div>
              <p className="dashboard-stat-label">Clientes Cadastrados</p>
              <p className="dashboard-stat-value">{clients.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="dashboard-stat-card">
          <div className="dashboard-stat-content">
            <FileText size={20} className="dashboard-stat-icon dashboard-stat-icon--success" />
            <div>
              <p className="dashboard-stat-label">Total de Contratos</p>
              <p className="dashboard-stat-value">{contracts.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="dashboard-stat-card">
          <div className="dashboard-stat-content">
            <AlertCircle size={20} className="dashboard-stat-icon dashboard-stat-icon--alert" />
            <div>
              <p className="dashboard-stat-label">Em Atraso</p>
              <p className="dashboard-stat-value">{overdueContracts}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Contracts */}
      {contracts.length > 0 && (
        <Card className="dashboard-recent-section">
          <div className="dashboard-section-header">
            <h3>Contratos Recentes</h3>
            <Button 
              variant="ghost" 
              size="small"
              onClick={() => onPageChange && onPageChange('historico-contratos')}
            >
              Ver Todos
            </Button>
          </div>
          <div className="dashboard-recent-list">
            {contracts.slice(0, 5).map(contract => (
              <div key={contract.id} className="dashboard-recent-item">
                <div className="dashboard-recent-info">
                  <p className="dashboard-recent-name">{contract.client_name}</p>
                  <p className="dashboard-recent-details">
                    {formatCurrency(contract.principal)} • {contract.installments}x • {formatCurrency(contract.monthly_installment)}/mês
                  </p>
                </div>
                <Badge 
                  variant={contract.status === 'open' ? 'green' : 'gray'}
                >
                  {contract.status === 'open' ? 'Ativo' : 'Fechado'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
};

export default Dashboard;
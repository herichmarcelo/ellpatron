import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Sparkles, MessageCircle, DollarSign, Ban, Search, ShieldAlert } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { formatCurrency, formatDate, formatCPF } from '../utils/formatters';
import { calculateOverduePenalties, calculateUpdatedTotal } from '../utils/calculations';
import { getContracts, updateContract, addToBlacklist, createPayment } from '../supabase/services.js';
import { useClients } from '../hooks/useClients';
import './Atrasados.css';

const Atrasados = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { clients } = useClients();

  const refreshOverdueContracts = () => {
    getContracts().then((result) => {
      if (result.success) {
        setContracts(result.data || []);
      }
    });
  };

  useEffect(() => {
    let isMounted = true;

    getContracts()
      .then((result) => {
        if (!isMounted) return;
        if (result.success) {
          setContracts(result.data || []);
        }
        setLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Erro ao carregar contratos em atraso:', error);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter only overdue contracts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueList = contracts
    .filter(contract => {
      if (contract.status !== 'open' && contract.status !== 'overdue') return false;
      const dueDate = new Date(contract.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    })
    .map(contract => {
      const dueDate = new Date(contract.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      
      const penalties = calculateOverduePenalties(
        contract.monthly_installment || contract.principal,
        contract.late_fee_percentage || 10,
        contract.daily_late_interest_percentage || 1,
        daysOverdue
      );

      const totalUpdated = calculateUpdatedTotal(
        contract.monthly_installment || contract.principal,
        penalties.multaValor,
        penalties.jurosDiariosValor
      );

      const matchedClient = clients.find(cl => cl.cpf === contract.client_cpf || cl.name === contract.client_name);

      return {
        ...contract,
        daysOverdue,
        multaValor: penalties.multaValor,
        jurosDiariosValor: penalties.jurosDiariosValor,
        totalUpdated,
        clientPhone: matchedClient?.phone || ''
      };
    });

  const filteredOverdue = overdueList.filter(item => {
    const queryStr = typeof searchQuery === 'string' ? searchQuery : (searchQuery?.target?.value || '');
    const query = queryStr.toLowerCase().trim();
    if (!query) return true;
    return (
      (item.client_name && item.client_name.toLowerCase().includes(query)) ||
      (item.client_cpf && item.client_cpf.includes(query)) ||
      (item.protocol_number && item.protocol_number.toLowerCase().includes(query))
    );
  });

  const totalOverdueAmount = overdueList.reduce((sum, item) => sum + item.totalUpdated, 0);
  const maxDaysOverdue = overdueList.length > 0 ? Math.max(...overdueList.map(i => i.daysOverdue)) : 0;

  const handleWhatsApp = (item) => {
    const rawPhone = (item.clientPhone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${item.client_name}, identificamos que a parcela do contrato *${item.protocol_number}* no valor atualizado de *${formatCurrency(item.totalUpdated)}* venceu em *${formatDate(item.due_date)}* (${item.daysOverdue} dias de atraso). Por favor, entre em contato para regularização.`
    );
    if (rawPhone) {
      window.open(`https://wa.me/55${rawPhone}?text=${message}`, '_blank');
    } else {
      const phoneInput = prompt('Telefone do cliente não encontrado. Digite o WhatsApp com DDD:');
      if (phoneInput) {
        window.open(`https://wa.me/55${phoneInput.replace(/\D/g, '')}?text=${message}`, '_blank');
      }
    }
  };

  const handlePay = async (item) => {
    if (confirm(`Confirmar o recebimento de ${formatCurrency(item.totalUpdated)} do contrato ${item.protocol_number}?`)) {
      try {
        await createPayment({
          contract_id: item.id,
          contract_protocol: item.protocol_number,
          amount: item.totalUpdated,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'pix',
          status: 'paid',
          notes: `Quitado com ${item.daysOverdue} dias de atraso`
        });

        await updateContract(item.id, { status: 'paid' });
        alert('Pagamento registrado com sucesso!');
        refreshOverdueContracts();
      } catch (err) {
        alert('Erro ao registrar pagamento: ' + err.message);
      }
    }
  };

  const handleBlacklist = async (item) => {
    const reason = prompt(
      `Motivo para adicionar ${item.client_name} à Lista Negra:`,
      `Inadimplência de ${item.daysOverdue} dias no contrato ${item.protocol_number}`
    );

    if (reason) {
      try {
        await addToBlacklist({
          client_name: item.client_name,
          client_cpf: item.client_cpf,
          client_phone: item.clientPhone,
          contract_id: item.id,
          protocol_number: item.protocol_number,
          principal: item.principal,
          total_debt: item.totalUpdated,
          days_overdue: item.daysOverdue,
          reason: reason
        });

        await updateContract(item.id, { status: 'cancelled' });
        alert('Cliente adicionado à Lista Negra com sucesso!');
        refreshOverdueContracts();
      } catch (err) {
        alert('Erro ao adicionar à Lista Negra: ' + err.message);
      }
    }
  };

  return (
    <div className="atrasados">
      <div className="atrasados-header">
        <div className="atrasados-title">
          <AlertTriangle size={24} />
          <h1>Pagamentos em Atraso</h1>
        </div>
      </div>

      <div className="atrasados-summary-group">
        <Card className="atrasados-summary-card">
          <div className="atrasados-summary-content">
            <div className="atrasados-summary-icon">
              <Clock size={22} />
            </div>
            <div>
              <span className="atrasados-summary-label">Contratos Vencidos</span>
              <span className="atrasados-summary-value text-blue">{overdueList.length}</span>
            </div>
          </div>
        </Card>

        <Card className="atrasados-summary-card atrasados-summary-card--danger">
          <div className="atrasados-summary-content">
            <div className="atrasados-summary-icon atrasados-summary-icon--danger">
              <DollarSign size={22} />
            </div>
            <div>
              <span className="atrasados-summary-label">Total em Atraso</span>
              <span className="atrasados-summary-value text-red">{formatCurrency(totalOverdueAmount)}</span>
            </div>
          </div>
        </Card>

        <Card className="atrasados-summary-card">
          <div className="atrasados-summary-content">
            <div className="atrasados-summary-icon atrasados-summary-icon--warning">
              <ShieldAlert size={22} />
            </div>
            <div>
              <span className="atrasados-summary-label">Maior Atraso</span>
              <span className="atrasados-summary-value text-gold">{maxDaysOverdue} dia(s)</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="atrasados-controls">
        <div className="atrasados-search">
          <Input
            icon={Search}
            placeholder="Buscar por cliente, CPF ou protocolo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e?.target ? e.target.value : (typeof e === 'string' ? e : ''))}
            rightAction={searchQuery ? (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                title="Limpar busca"
              >
                <X size={16} />
              </button>
            ) : null}
            fullWidth
          />
        </div>
      </div>

      {loading ? (
        <div className="atrasados-loading">Carregando cobranças em atraso...</div>
      ) : filteredOverdue.length === 0 ? (
        <Card className="atrasados-empty">
          <div className="atrasados-empty-content">
            <div className="atrasados-empty-icon">
              <Sparkles size={48} />
            </div>
            <h3 className="atrasados-empty-title">Nenhum pagamento em atraso</h3>
            <p className="atrasados-empty-description">
              Excelente! Todos os pagamentos e contratos estão em dia.
            </p>
          </div>
        </Card>
      ) : (
        <div className="atrasados-grid">
          {filteredOverdue.map(item => (
            <Card key={item.id} className="atrasado-card">
              <div className="atrasado-card-header">
                <div>
                  <h3 className="atrasado-client-name">{item.client_name}</h3>
                  <span className="atrasado-protocol">{item.protocol_number} • CPF: {formatCPF(item.client_cpf)}</span>
                </div>
                <Badge variant={item.daysOverdue >= 30 ? 'red' : 'gold'}>
                  {item.daysOverdue} dias de atraso
                </Badge>
              </div>

              <div className="atrasado-details">
                <div className="atrasado-detail-row">
                  <span className="atrasado-detail-label">Vencimento Original:</span>
                  <span className="atrasado-detail-val">{formatDate(item.due_date)}</span>
                </div>
                <div className="atrasado-detail-row">
                  <span className="atrasado-detail-label">Valor Original:</span>
                  <span className="atrasado-detail-val">{formatCurrency(item.monthly_installment || item.principal)}</span>
                </div>
                <div className="atrasado-detail-row">
                  <span className="atrasado-detail-label">Multa + Juros Diários:</span>
                  <span className="atrasado-detail-val atrasado-detail-val--penalty">
                    + {formatCurrency(item.multaValor + item.jurosDiariosValor)}
                  </span>
                </div>
                <div className="atrasado-detail-row atrasado-detail-row--total">
                  <span className="atrasado-detail-label">Total Atualizado:</span>
                  <span className="atrasado-detail-val atrasado-detail-val--total">
                    {formatCurrency(item.totalUpdated)}
                  </span>
                </div>
              </div>

              <div className="atrasado-actions">
                <Button
                  variant="primary"
                  size="small"
                  icon={MessageCircle}
                  onClick={() => handleWhatsApp(item)}
                >
                  Cobrar WhatsApp
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  icon={DollarSign}
                  onClick={() => handlePay(item)}
                >
                  Quitar
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  icon={Ban}
                  onClick={() => handleBlacklist(item)}
                >
                  Lista Negra
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Atrasados;
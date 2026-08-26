import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Search, Edit, Eye, Phone, MapPin, Calendar, 
  FileText, Plus, Download, ShieldAlert, Ban, X, ChevronRight,
  CheckCircle2, DollarSign, ArrowLeft, AlertCircle, ChevronDown, ChevronUp, Check,
  PiggyBank, ArrowDownLeft, ArrowUpRight, Wallet
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import CustomSelect from '../components/CustomSelect';
import DatePicker from '../components/DatePicker';
import CreditScoreCard from '../components/CreditScoreCard';
import ModalSaque from '../components/ModalSaque';
import ModalDepositos from '../components/ModalDepositos';
import { useClients, useAddToBlacklist, useRemoveFromBlacklist, isClientBlacklisted } from '../hooks/useClients';
import { formatPhone, formatDate, formatCPF, getInitials, stringToColor, formatAddress, formatCurrency, getBrasiliaISODate } from '../utils/formatters';
import { getContracts, getPayments, createPayment, updateContract, getSavingsTransactions } from '../supabase/services.js';
import { calculateCreditScore } from '../utils/scoreCalculator';
import { calculateOverduePenalties } from '../utils/calculations';
import { exportClientsExcel } from '../utils/exportUtils';
import './ListaClientes.css';

const ListaClientes = () => {
  const navigate = useNavigate();
  const { mutate: addToBlacklist } = useAddToBlacklist();
  const { mutate: removeFromBlacklist } = useRemoveFromBlacklist();
  
  const { blacklist = [], getClientStats, searchClients } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientContracts, setClientContracts] = useState([]);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractPayments, setContractPayments] = useState([]);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  
  // Estados para o Módulo de Poupança / Carteira
  const [allSavingsTransactions, setAllSavingsTransactions] = useState([]);
  const [showSaqueModal, setShowSaqueModal] = useState(false);
  const [showDepositosModal, setShowDepositosModal] = useState(false);
  const [selectedSavingsClient, setSelectedSavingsClient] = useState(null);

  const [newPayment, setNewPayment] = useState({
    installment_number: '',
    amount: '',
    payment_date: getBrasiliaISODate(),
    payment_method: 'pix',
    notes: ''
  });
  const [allContracts, setAllContracts] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [expandedPaidInstallments, setExpandedPaidInstallments] = useState({});

  const toggleExpandInstallment = (instNumber) => {
    setExpandedPaidInstallments(prev => ({
      ...prev,
      [instNumber]: !prev[instNumber]
    }));
  };

  // Carrega contratos, pagamentos e transações de poupança em tempo real
  const fetchAllData = async (isMounted = true) => {
    try {
      const [contractsRes, paymentsRes, savingsRes] = await Promise.all([
        getContracts(),
        getPayments(),
        getSavingsTransactions()
      ]);
      if (isMounted) {
        if (contractsRes.success) setAllContracts(contractsRes.data || []);
        if (paymentsRes.success) setAllPayments(paymentsRes.data || []);
        if (savingsRes.success) setAllSavingsTransactions(savingsRes.data || []);
      }
    } catch (err) {
      console.error('Error loading contracts/payments/savings:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchAllData(isMounted);
    return () => { isMounted = false; };
  }, []);

  // Calcula o saldo atual da carteira/poupança de cada cliente
  const getClientSavingsBalance = (clientId) => {
    if (!clientId) return 0;
    const clientTx = allSavingsTransactions.filter(t => (t.client_id === clientId || t.clientId === clientId));
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalInterest = 0;

    clientTx.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit') totalDeposits += amt;
      else if (t.type === 'withdrawal') totalWithdrawals += amt;
      else if (t.type === 'interest') totalInterest += amt;
      else if (t.type === 'adjustment') {
        if (amt >= 0) totalDeposits += amt;
        else totalWithdrawals += Math.abs(amt);
      }
    });

    return Math.max(0, (totalDeposits + totalInterest) - totalWithdrawals);
  };

  const handleOpenSaque = (client) => {
    setSelectedSavingsClient(client);
    setShowSaqueModal(true);
  };

  const handleOpenDepositos = (client) => {
    setSelectedSavingsClient(client);
    setShowDepositosModal(true);
  };

  const getClientScore = (client) => {
    if (!client) return null;
    const isBlocked = isClientBlacklisted(blacklist, client.id);
    return calculateCreditScore(client, allContracts, allPayments, isBlocked);
  };

  const stats = getClientStats();
  
  const filteredClients = searchClients(searchQuery).filter(client => {
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesStatus;
  });

  const handleAddClient = () => {
    navigate('/adicionar-cliente');
  };

  const handleEditClient = (clientId) => {
    navigate(`/editar-cliente/${clientId}`);
  };

  const handleViewClient = (client) => {
    setSelectedClientDetails(client);
    setShowClientDetailsModal(true);
  };

  const handleToggleBlacklist = (client) => {
    if (!client) return;
    const isBlacklisted = isClientBlacklisted(blacklist, client.id);
    if (isBlacklisted) {
      if (confirm(`Deseja remover ${client.name} da Lista Negra?`)) {
        removeFromBlacklist(client.id);
      }
    } else {
      const reason = prompt(`Motivo do bloqueio de ${client.name} na Lista Negra:`);
      if (reason) {
        addToBlacklist({ clientId: client.id, reason });
      }
    }
  };

  const handleWhatsAppClick = (phone, clientName) => {
    if (!phone) {
      alert('Telefone do cliente não cadastrado.');
      return;
    }
    // 1. Remove parênteses, espaços e traços do telefone (deixa só os números)
    const numeroLimpo = phone.replace(/\D/g, '');
    
    // 2. Mensagem profissional personalizada com o nome do cliente
    const nomeCliente = clientName ? clientName.trim() : 'Cliente';
    const mensagem = `Olá, ${nomeCliente}! Tudo bem por aí? Entramos em contato para alinhar algumas informações referentes ao seu cadastro e aos seus repasses. Assim que tiver um momento livre, me dê um retorno por favor!`;
    
    // 3. Converte o texto para o formato de URL seguro
    const textoCodificado = encodeURIComponent(mensagem);
    
    // 4. Monta o link final com o código do país (+55)
    const urlWhatsApp = `https://wa.me/55${numeroLimpo}?text=${textoCodificado}`;
    
    // 5. Abre o WhatsApp em nova aba
    window.open(urlWhatsApp, '_blank');
  };

  const handleViewContracts = async (client) => {
    setSelectedClient(client);
    setShowContractsModal(true);
    
    try {
      const result = await getContracts();
      if (result.success) {
        const contracts = result.data.filter(
          contract => contract.client_name === client.name || contract.client_cpf === client.cpf
        );
        setClientContracts(contracts);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      setClientContracts([]);
    }
  };

  const handleViewPayments = async (contract) => {
    setSelectedContract(contract);
    setShowPaymentsModal(true);
    setShowAddPaymentForm(false);
    setSelectedInstallment(null);
    
    try {
      const result = await getPayments({ contractProtocol: contract.protocol_number });
      if (result.success) {
        setContractPayments(result.data || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      setContractPayments([]);
    }
  };

  const handleOpenPayInstallment = (inst) => {
    setSelectedInstallment(inst);
    setNewPayment({
      installment_number: inst.number,
      amount: inst.totalDue > 0 ? inst.totalDue.toFixed(2) : inst.monthlyInstallment.toFixed(2),
      payment_date: getBrasiliaISODate(),
      payment_method: 'pix',
      notes: ''
    });
    setShowAddPaymentForm(true);
  };

  const handleCobrarParcela = (client, inst) => {
    // 1. Obtém e limpa o telefone do cliente
    const phone = client?.phone || selectedContract?.client_phone || '';
    const numeroLimpo = phone.replace(/\D/g, '');
    const clientName = client?.name || selectedContract?.client_name || 'Cliente';
    
    // 2. Define os valores e dados da parcela
    const valorCobrado = formatCurrency(inst.totalDue > 0 ? inst.totalDue : inst.monthlyInstallment);
    const dataVenc = formatDate(inst.dueDate);
    const numeroParcela = `${inst.number}/${inst.totalCount}`;
    
    // 3. Monta a mensagem personalizada
    let mensagem = '';
    if (inst.isOverdue) {
      mensagem = `Olá, *${clientName}*, tudo bem? Aqui é da Ell Patron.\n\nConsta em nosso sistema que a sua parcela *${numeroParcela}* no valor atualizado de *${valorCobrado}* (com vencimento original em ${dataVenc}) encontra-se pendente com ${inst.daysOverdue} dia(s) de atraso.\n\nHouve algum imprevisto? Me dê um retorno para alinharmos a baixa, por favor!`;
    } else {
      mensagem = `Olá, *${clientName}*! Tudo bem? Aqui é da Ell Patron.\n\nEntrando em contato referente à sua parcela *${numeroParcela}* do seu contrato.\n\n*Vencimento:* ${dataVenc}\n*Valor:* ${valorCobrado}\n\nAssim que realizar o pagamento, pode me enviar o comprovante por aqui mesmo. Caso precise da chave PIX, é só me avisar. Fico à disposição!`;
    }
    
    // 4. Codifica e abre o WhatsApp
    const url = numeroLimpo 
      ? `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
      
    window.open(url, '_blank');
  };

  const handleAddPayment = async () => {
    try {
      const paymentAmount = parseFloat(newPayment.amount) || 0;
      if (paymentAmount <= 0) {
        alert('Por favor, informe um valor válido para o pagamento.');
        return;
      }

      const paymentDateFormatted = newPayment.payment_date instanceof Date
        ? getBrasiliaISODate(newPayment.payment_date)
        : (newPayment.payment_date || getBrasiliaISODate());

      const paymentData = {
        contract_id: selectedContract.id,
        contract_protocol: selectedContract.protocol_number,
        installment_number: parseInt(newPayment.installment_number) || 1,
        amount: paymentAmount,
        payment_date: paymentDateFormatted,
        payment_method: newPayment.payment_method || 'pix',
        notes: newPayment.notes || ''
      };

      const result = await createPayment(paymentData);
      
      if (result.success) {
        const paymentsResult = await getPayments({ contractProtocol: selectedContract.protocol_number });
        const updatedPayments = paymentsResult.success ? (paymentsResult.data || []) : [];
        setContractPayments(updatedPayments);

        // Atualiza pagamentos gerais para reflexo imediato no Score
        setAllPayments(prev => [...prev, result.data || paymentData]);

        // Verificar se todas as parcelas foram quitadas
        const totalInstallments = parseInt(selectedContract.installments || selectedContract.installments_count || 1);
        const monthlyVal = Number(selectedContract.monthly_installment || (selectedContract.total_amount / totalInstallments));
        let allPaid = true;
        for (let i = 1; i <= totalInstallments; i++) {
          const paid = updatedPayments.filter(p => Number(p.installment_number) === i).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          if (paid < monthlyVal - 0.01) {
            allPaid = false;
            break;
          }
        }

        if (allPaid && selectedContract.status !== 'paid') {
          await updateContract(selectedContract.id, { status: 'paid' });
          setSelectedContract({ ...selectedContract, status: 'paid' });
          const contractsRes = await getContracts();
          if (contractsRes.success && selectedClient) {
            setClientContracts(contractsRes.data.filter(c => c.client_name === selectedClient.name || c.client_cpf === selectedClient.cpf));
          }
        }

        // Abre o Modal de Sucesso Customizado C6 Carbon
        setSuccessModalData({
          amount: paymentAmount,
          installment_number: paymentData.installment_number,
          total_installments: totalInstallments,
          payment_date: paymentDateFormatted,
          payment_method: paymentData.payment_method,
          protocol_number: selectedContract.protocol_number,
          client_name: selectedClient?.name || selectedContract.client_name || ''
        });
        setShowSuccessModal(true);

        setNewPayment({
          installment_number: '',
          amount: '',
          payment_date: getBrasiliaISODate(),
          payment_method: 'pix',
          notes: ''
        });
      } else {
        alert('Erro ao registrar pagamento: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Erro ao registrar pagamento: ' + error.message);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessModalData(null);
    setShowAddPaymentForm(false);
    setSelectedInstallment(null);
  };

  const getInstallmentsData = () => {
    if (!selectedContract) return [];
    const totalCount = parseInt(selectedContract.installments || selectedContract.installments_count || 1);
    const monthlyInstallment = Number(selectedContract.monthly_installment || (selectedContract.total_amount / totalCount));
    const penaltyRate = Number(selectedContract.penalty_rate || selectedContract.late_fee_percentage || 10);
    const dailyInterestRate = Number(selectedContract.daily_interest_rate || selectedContract.daily_late_interest_percentage || 1);
    const baseDueDate = selectedContract.due_date ? new Date(selectedContract.due_date) : new Date();

    const list = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= totalCount; i++) {
      const instDueDate = new Date(baseDueDate);
      instDueDate.setMonth(baseDueDate.getMonth() + (i - 1));
      const dueCompare = new Date(instDueDate);
      dueCompare.setHours(0, 0, 0, 0);

      const paymentsForThis = contractPayments.filter(p => Number(p.installment_number) === i);
      const totalPaid = paymentsForThis.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const remainingPrincipal = Math.max(0, monthlyInstallment - totalPaid);

      const isOverdue = remainingPrincipal > 0.01 && today > dueCompare;
      const daysOverdue = isOverdue ? Math.max(0, Math.floor((today - dueCompare) / (1000 * 60 * 60 * 24))) : 0;

      let penaltyAmount = 0;
      let totalDailyInterest = 0;
      let totalDue = remainingPrincipal;

      if (isOverdue && daysOverdue > 0) {
        const penalties = calculateOverduePenalties(remainingPrincipal, penaltyRate, dailyInterestRate, daysOverdue);
        penaltyAmount = penalties.penaltyAmount || penalties.multaValor || 0;
        totalDailyInterest = penalties.totalDailyInterest || penalties.jurosDiariosValor || 0;
        totalDue = remainingPrincipal + (penalties.totalPenalties || (penaltyAmount + totalDailyInterest));
      }

      let status = 'pending';
      let statusLabel = 'PENDENTE';
      let badgeClass = 'c6-badge-pending';

      if (remainingPrincipal <= 0.01) {
        status = 'paid';
        statusLabel = 'PAGA';
        badgeClass = 'c6-badge-paid';
      } else if (totalPaid > 0) {
        status = 'partial';
        statusLabel = isOverdue ? `PARCIAL (${daysOverdue}d ATRASO)` : 'PARCIAL';
        badgeClass = isOverdue ? 'c6-badge-overdue' : 'c6-badge-partial';
      } else if (isOverdue) {
        status = 'overdue';
        statusLabel = `EM ATRASO (${daysOverdue}d)`;
        badgeClass = 'c6-badge-overdue';
      }

      list.push({
        number: i,
        totalCount,
        dueDate: instDueDate,
        monthlyInstallment,
        totalPaid,
        remainingPrincipal,
        isOverdue,
        daysOverdue,
        penaltyAmount,
        totalDailyInterest,
        totalDue,
        status,
        statusLabel,
        badgeClass,
        payments: paymentsForThis
      });
    }
    return list;
  };

  const handleExportExcel = () => {
    exportClientsExcel(filteredClients);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="green">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="dark">Inativo</Badge>;
      case 'blacklisted':
        return <Badge variant="red">Lista Negra</Badge>;
      default:
        return <Badge variant="ghost">{status}</Badge>;
    }
  };

  return (
    <div className="lista-clientes">
      {/* Cabeçalho da Lista */}
      <div className="lista-clientes-header">
        <div className="lista-clientes-title">
          <Users size={24} color="#d4af37" />
          <h2>LISTA DE CLIENTES</h2>
        </div>
        
        {/* Container para os botões principais lado a lado */}
        <div className="header-action-buttons">
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExportExcel}
          >
            Exportar Excel
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={handleAddClient}
          >
            Adicionar Cliente
          </Button>
        </div>
      </div>

      {/* KPI CARDS ANALÍTICOS DE CLIENTES */}
      <div className="lista-clientes-kpi-grid">
        <Card className="lista-clientes-kpi-card">
          <div className="lista-clientes-kpi-content">
            <div className="lista-clientes-kpi-icon">
              <UserPlus size={22} />
            </div>
            <div>
              <span className="lista-clientes-kpi-label">Total de Clientes</span>
              <span className="lista-clientes-kpi-value text-gold">{stats.total}</span>
            </div>
          </div>
        </Card>

        <Card className="lista-clientes-kpi-card">
          <div className="lista-clientes-kpi-content">
            <div className="lista-clientes-kpi-icon lista-clientes-kpi-icon--green">
              <Phone size={22} />
            </div>
            <div>
              <span className="lista-clientes-kpi-label">Clientes Ativos</span>
              <span className="lista-clientes-kpi-value text-green">{stats.active}</span>
            </div>
          </div>
        </Card>

        <Card className="lista-clientes-kpi-card">
          <div className="lista-clientes-kpi-content">
            <div className="lista-clientes-kpi-icon lista-clientes-kpi-icon--blue">
              <FileText size={22} />
            </div>
            <div>
              <span className="lista-clientes-kpi-label">Inativos / Quitados</span>
              <span className="lista-clientes-kpi-value text-blue">{stats.inactive}</span>
            </div>
          </div>
        </Card>

        <Card className="lista-clientes-kpi-card">
          <div className="lista-clientes-kpi-content">
            <div className="lista-clientes-kpi-icon lista-clientes-kpi-icon--red">
              <Ban size={22} />
            </div>
            <div>
              <span className="lista-clientes-kpi-label">Na Lista Negra</span>
              <span className="lista-clientes-kpi-value text-red">{stats.blacklisted}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="lista-clientes-controls">
        <div className="lista-clientes-search">
          <Input
            placeholder="Buscar por nome, telefone ou CPF..."
            icon={Search}
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
        
        <div className="lista-clientes-filters">
          <CustomSelect
            options={[
              { value: 'all', label: 'Todos os status' },
              { value: 'active', label: 'Ativos' },
              { value: 'inactive', label: 'Inativos' },
              { value: 'blacklisted', label: 'Lista Negra' }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Todos os status"
          />
        </div>
      </div>

      <div className="lista-clientes-content">
        {filteredClients.length === 0 ? (
          <Card className="lista-clientes-empty">
            <p>Nenhum cliente encontrado.</p>
          </Card>
        ) : (
          <div className="lista-clientes-grid">
            {filteredClients.map((client) => {
              const isBlacklisted = isClientBlacklisted(client.id, blacklist);
              return (
                <Card key={client.id} className="cliente-card">
                  {/* CABEÇALHO DO CARD */}
                  <div className="cliente-card-header">
                    {/* 1. LADO ESQUERDO: Avatar + Coluna com Nome e Tag de Status */}
                    <div className="cliente-info-principal">
                      <div 
                        className="cliente-avatar"
                        style={{ backgroundColor: stringToColor(client.name) }}
                      >
                        {getInitials(client.name)}
                      </div>
                      
                      <div className="cliente-nomes">
                        <h3 className="cliente-nome-titulo">{client.name}</h3>
                        <div className="cliente-tags-row">
                          {getStatusBadge(client.status)}
                          <CreditScoreCard scoreData={getClientScore(client)} variant="badge" />
                        </div>
                      </div>
                    </div>

                    {/* 2. LADO DIREITO: Botão de Destaque do WhatsApp */}
                    <button 
                      className="btn-header-whatsapp" 
                      onClick={() => handleWhatsAppClick(client.phone, client.name)}
                      title="Chamar no WhatsApp"
                      aria-label="Chamar no WhatsApp"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path fill="#ffffff" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.37 1 2.54c.12.17 1.73 2.65 4.2 3.71.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3z"/>
                      </svg>
                    </button>
                  </div>

                  {/* CORPO DO CARD (Dados e Saldo) */}
                  <div className="cliente-card-body">
                    {/* NOVO CARD DE SALDO TOTAL (POUPANÇA / CARTEIRA) */}
                    <div className="cliente-saldo-card">
                      <div className="cliente-saldo-topo">
                        <span className="cliente-saldo-label">
                          <PiggyBank size={14} /> Saldo Total
                        </span>
                        <span className="cliente-saldo-badge">Poupança</span>
                      </div>
                      <div className="cliente-saldo-valor">
                        {formatCurrency(getClientSavingsBalance(client.id))}
                      </div>
                    </div>

                    <p className="cliente-dado">
                      <span className="dado-label">CPF:</span> {formatCPF(client.cpf)}
                    </p>
                    <p className="cliente-dado">
                      <Phone size={14} color="#d4af37" /> {formatPhone(client.phone)}
                    </p>
                    <p className="cliente-dado">
                      <Calendar size={14} color="#d4af37" /> {formatDate(client.registrationDate || client.created_at)}
                    </p>
                    {(client.street || client.city) && (
                      <p className="cliente-dado">
                        <MapPin size={14} color="#d4af37" /> {formatAddress(client)}
                      </p>
                    )}

                    {/* NOVOS BOTÕES DE AÇÃO RÁPIDA: SAQUE & DEPÓSITOS */}
                    <div className="cliente-carteira-actions">
                      <button 
                        type="button" 
                        className="btn-carteira-action btn-carteira-saque"
                        onClick={() => handleOpenSaque(client)}
                        title="Realizar Saque"
                      >
                        <ArrowDownLeft size={15} />
                        <span>Saque</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn-carteira-action btn-carteira-deposito"
                        onClick={() => handleOpenDepositos(client)}
                        title="Histórico de Depósitos e Extrato"
                      >
                        <ArrowUpRight size={15} />
                        <span>Depósitos</span>
                      </button>
                    </div>
                  </div>

                  {/* AÇÕES (Grade 2x2 Exata com 4 Botões) */}
                  <div className="cliente-card-actions">
                    <div className="actions-grid">
                      <button 
                        className="btn-action action-view"
                        onClick={() => handleViewClient(client)}
                      >
                        <Eye size={15}/> Ver Perfil
                      </button>
                      
                      <button 
                        className="btn-action action-docs"
                        onClick={() => handleViewContracts(client)}
                      >
                        <FileText size={15}/> Contratos
                      </button>
                      
                      <button 
                        className="btn-action action-edit"
                        onClick={() => handleEditClient(client.id)}
                      >
                        <Edit size={15}/> Editar
                      </button>
                      
                      <button 
                        className={`btn-action ${isBlacklisted ? 'action-unblock' : 'action-block'}`}
                        onClick={() => handleToggleBlacklist(client)}
                      >
                        {isBlacklisted ? (
                          <>
                            <ShieldAlert size={15}/> Desbloquear
                          </>
                        ) : (
                          <>
                            <Ban size={15}/> Bloquear
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Details Modal */}
      {showClientDetailsModal && selectedClientDetails && (
        <div className="modal-overlay" onClick={() => setShowClientDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Cabeçalho do Modal */}
            <div className="modal-header">
              <h2>Detalhes do Cliente</h2>
              <button className="modal-close-btn" onClick={() => setShowClientDetailsModal(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            {/* Perfil (Avatar Redondo + Nome) */}
            <div className="modal-profile">
              <div 
                className="modal-avatar"
                style={{ backgroundColor: stringToColor(selectedClientDetails.name) }}
              >
                {getInitials(selectedClientDetails.name)}
              </div>
              <div className="modal-profile-info">
                <h3>{selectedClientDetails.name}</h3>
                <div>{getStatusBadge(selectedClientDetails.status)}</div>
              </div>
            </div>

            {/* Score de Crédito Completo */}
            <CreditScoreCard scoreData={getClientScore(selectedClientDetails)} variant="full" />

            {/* Grade de Informações Responsiva */}
            <div className="modal-info-grid">
              <div className="info-box">
                <span className="info-label">CPF</span>
                <span className="info-value">{formatCPF(selectedClientDetails.cpf)}</span>
              </div>
              
              <div className="info-box">
                <span className="info-label">Telefone / WhatsApp</span>
                <span 
                  className="info-value value-wpp" 
                  onClick={() => handleWhatsAppClick(selectedClientDetails.phone, selectedClientDetails.name)}
                  title="Abrir WhatsApp"
                >
                  {formatPhone(selectedClientDetails.phone)}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path fill="#25d366" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.37 1 2.54c.12.17 1.73 2.65 4.2 3.71.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3z"/>
                  </svg>
                </span>
              </div>

              {selectedClientDetails.email && (
                <div className="info-box">
                  <span className="info-label">E-mail</span>
                  <span className="info-value">{selectedClientDetails.email}</span>
                </div>
              )}
              
              {/* Endereço ocupa a linha inteira no PC */}
              <div className="info-box info-full-width">
                <span className="info-label">Endereço</span>
                {formatAddress(selectedClientDetails) ? (
                  <span className="info-value">{formatAddress(selectedClientDetails)}</span>
                ) : (
                  <span className="info-value text-muted">Não informado</span>
                )}
              </div>
              
              <div className="info-box">
                <span className="info-label">Data de Cadastro</span>
                <span className="info-value">{formatDate(selectedClientDetails.registrationDate || selectedClientDetails.created_at)}</span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="modal-actions">
              <Button 
                variant="secondary" 
                icon={FileText} 
                className="btn-modal"
                onClick={() => {
                  setShowClientDetailsModal(false);
                  handleViewContracts(selectedClientDetails);
                }}
              >
                Ver Contratos
              </Button>
              <Button 
                variant="primary" 
                icon={Edit} 
                className="btn-modal"
                onClick={() => {
                  setShowClientDetailsModal(false);
                  navigate(`/editar-cliente/${selectedClientDetails.id}`);
                }}
              >
                Editar Cadastro
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Contracts Modal (C6 Carbon Style) */}
      {showContractsModal && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowContractsModal(false)}>
          <div className="c6-modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Cabeçalho do Modal */}
            <div className="c6-modal-header">
              <div className="c6-header-titles">
                <h2 className="c6-title">Histórico de Contratos</h2>
                <span className="c6-subtitle">{selectedClient.name}</span>
              </div>
              <button className="c6-close-btn" onClick={() => setShowContractsModal(false)} aria-label="Fechar">
                <X size={22} />
              </button>
            </div>

            {/* Lista de Contratos */}
            <div className="c6-contracts-list">
              {clientContracts.length === 0 ? (
                <div className="c6-empty-state">
                  <FileText size={32} color="#737380" />
                  <p>Nenhum contrato encontrado para este cliente.</p>
                </div>
              ) : (
                clientContracts.map(contract => {
                  const statusLabel = contract.status === 'open' ? 'EM ABERTO' : contract.status === 'paid' ? 'QUITADO' : contract.status === 'overdue' ? 'EM ATRASO' : (contract.status || '').toUpperCase();
                  const badgeClass = contract.status === 'open' ? 'c6-badge-open' : contract.status === 'paid' ? 'c6-badge-paid' : 'c6-badge-overdue';

                  return (
                    <div key={contract.id} className="c6-contract-card">
                      {/* Topo: ID e Status */}
                      <div className="c6-card-header">
                        <div className="c6-contract-id">
                          <FileText size={16} color="#EAB308" />
                          <span>#{contract.protocol_number}</span>
                        </div>
                        <span className={`c6-badge ${badgeClass}`}>{statusLabel}</span>
                      </div>

                      {/* A NOVA GRADE 2x2 DE INFORMAÇÕES */}
                      <div className="contract-mini-cards-grid">
                        {/* Linha 1: Datas (Fundo sutil escuro/azulado) */}
                        <div className="mini-card card-date">
                          <span className="mini-card-label">Emissão</span>
                          <span className="mini-card-value">{formatDate(contract.loan_date || contract.created_at)}</span>
                        </div>
                        <div className="mini-card card-date">
                          <span className="mini-card-label">Vencimento</span>
                          <span className="mini-card-value">{formatDate(contract.due_date)}</span>
                        </div>

                        {/* Linha 2: Valores (Fundo sutil dourado/esverdeado) */}
                        <div className="mini-card card-money">
                          <span className="mini-card-label">Valor Principal</span>
                          <span className="mini-card-value">{formatCurrency(contract.principal)}</span>
                        </div>
                        <div className="mini-card card-money">
                          <span className="mini-card-label">Parcelamento</span>
                          <span className="mini-card-value">
                            {contract.installments_count || contract.installments || 1}x {formatCurrency(contract.monthly_installment || contract.principal)}
                          </span>
                        </div>
                      </div>

                      {/* VALOR TOTAL EM LINHA ÚNICA */}
                      <div className="contract-total-inline">
                        <span className="total-inline-label">Valor Total</span>
                        <span className="total-inline-value text-gold">
                          {formatCurrency(contract.total_amount || contract.total_original || contract.principal)}
                        </span>
                      </div>

                      {/* Botão de Ação Minimalista */}
                      <button 
                        className="c6-action-btn"
                        onClick={() => handleViewPayments(contract)}
                      >
                        <span>Ver Pagamentos</span>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* Payments Modal (C6 Carbon Style with Dynamic Installments & Partial Payments) */}
      {showPaymentsModal && selectedContract && (
        <div className="modal-overlay" onClick={() => setShowPaymentsModal(false)}>
          <div className="c6-modal-content c6-modal-large" onClick={(e) => e.stopPropagation()}>
            
            {showAddPaymentForm ? (
              /* ========================================================
                 TELA 2: REGISTRAR BAIXA (PÁGINA DEDICADA POR CIMA)
                 ======================================================== */
              <div className="c6-payment-page-view">
                {/* Cabeçalho da Página de Pagamento */}
                <div className="c6-modal-header c6-payment-page-header">
                  <div className="c6-header-titles">
                    <button 
                      type="button"
                      className="c6-back-page-btn"
                      onClick={() => { setShowAddPaymentForm(false); setSelectedInstallment(null); }}
                    >
                      <ArrowLeft size={16} /> Voltar para Parcelas
                    </button>
                    <h2 className="c6-title">Registrar Baixa de Pagamento</h2>
                    <span className="c6-subtitle">Contrato #{selectedContract.protocol_number}</span>
                  </div>
                  <button 
                    className="c6-close-btn" 
                    onClick={() => { setShowPaymentsModal(false); setShowAddPaymentForm(false); setSelectedInstallment(null); }} 
                    aria-label="Fechar"
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* Corpo da Página de Pagamento */}
                <div className="c6-payment-page-body">
                  {/* Resumo da Parcela Selecionada */}
                  <div className="c6-selected-inst-banner">
                    <div className="c6-inst-banner-top">
                      <div className="c6-banner-parcela-badge">
                        <DollarSign size={16} className="text-gold" />
                        <span>Parcela {newPayment.installment_number}/{selectedContract.installments_count || selectedContract.installments || 1}</span>
                      </div>
                      {selectedInstallment && (
                        <span className={`c6-badge ${selectedInstallment.badgeClass}`}>
                          {selectedInstallment.statusLabel}
                        </span>
                      )}
                    </div>

                    <div className="c6-banner-grid">
                      <div className="c6-banner-item">
                        <span className="banner-label">Valor Original</span>
                        <span className="banner-val">
                          {formatCurrency(selectedInstallment?.monthlyInstallment || (selectedContract.total_amount / (selectedContract.installments || 1)))}
                        </span>
                      </div>

                      <div className="c6-banner-item highlight-gold">
                        <span className="banner-label">Valor a Pagar (Atualizado)</span>
                        <span className="banner-val text-gold">
                          {formatCurrency(selectedInstallment?.totalDue > 0 ? selectedInstallment.totalDue : (selectedInstallment?.monthlyInstallment || 0))}
                        </span>
                      </div>

                      <div className="c6-banner-item">
                        <span className="banner-label">Vencimento</span>
                        <span className="banner-val">
                          {formatDate(selectedInstallment?.dueDate || selectedContract.due_date)}
                        </span>
                      </div>

                      <div className="c6-banner-item">
                        <span className="banner-label">Já Pago nesta Parcela</span>
                        <span className="banner-val text-green">
                          {formatCurrency(selectedInstallment?.paidAmount || selectedInstallment?.totalPaid || 0)}
                        </span>
                      </div>
                    </div>

                    {selectedInstallment?.isOverdue && selectedInstallment?.daysOverdue > 0 && (
                      <div className="c6-banner-alert-overdue">
                        <AlertCircle size={15} />
                        <span>Atraso de <strong>{selectedInstallment.daysOverdue} dia(s)</strong>. Multa e juros diários já calculados no saldo a pagar.</span>
                      </div>
                    )}
                  </div>

                  {/* Formulário de Baixa */}
                  <div className="c6-payment-form-card">
                    <h4 className="c6-form-title">Dados do Recebimento</h4>

                    <div className="c6-payment-form-grid">
                      <div className="c6-form-group">
                        <label>Valor Recebido (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newPayment.amount}
                          onChange={(e) => {
                            const val = e?.target?.value !== undefined ? e.target.value : e;
                            setNewPayment(prev => ({ ...prev, amount: val }));
                          }}
                          required
                          autoFocus
                        />
                      </div>

                      <div className="c6-form-group">
                        <DatePicker
                          label="Data do Pagamento"
                          value={newPayment.payment_date}
                          onChange={(val) => {
                            const isoDate = val instanceof Date ? getBrasiliaISODate(val) : val;
                            setNewPayment(prev => ({ ...prev, payment_date: isoDate }));
                          }}
                          fullWidth
                        />
                      </div>

                      <div className="c6-form-group c6-form-full">
                        <CustomSelect
                          label="Forma de Pagamento"
                          options={[
                            { value: 'pix', label: 'PIX' },
                            { value: 'dinheiro', label: 'Dinheiro' },
                            { value: 'transferencia', label: 'Transferência' }
                          ]}
                          value={newPayment.payment_method}
                          onChange={(val) => setNewPayment(prev => ({ ...prev, payment_method: val }))}
                        />
                      </div>

                      <div className="c6-form-group c6-form-full">
                        <label>Observações / Anotações</label>
                        <Input
                          placeholder="Ex: Pagamento parcial via PIX com comprovante..."
                          value={typeof newPayment.notes === 'string' ? newPayment.notes : ''}
                          onChange={(e) => {
                            const val = e?.target?.value !== undefined ? e.target.value : e;
                            setNewPayment(prev => ({ ...prev, notes: val }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="c6-payment-page-actions">
                      <Button 
                        variant="secondary"
                        onClick={() => { setShowAddPaymentForm(false); setSelectedInstallment(null); }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={handleAddPayment}
                      >
                        Confirmar Pagamento
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================
                 TELA 1: LISTA DE PARCELAS E VISÃO GERAL DO CONTRATO
                 ======================================================== */
              <>
                {/* Cabeçalho do Modal */}
                <div className="c6-modal-header">
                  <div className="c6-header-titles">
                    <h2 className="c6-title">Gestão de Pagamentos</h2>
                    <span className="c6-subtitle">Contrato #{selectedContract.protocol_number}</span>
                  </div>
                  <button className="c6-close-btn" onClick={() => setShowPaymentsModal(false)} aria-label="Fechar">
                    <X size={22} />
                  </button>
                </div>

                {/* Corpo do Modal */}
                <div className="c6-modal-body">
                  
                  {/* Bloco 1: Resumo do Contrato */}
                  <div className="c6-summary-panel">
                    <h3 className="c6-section-title">Resumo do Contrato</h3>
                    
                    <div className="c6-card-grid">
                      <div className="c6-data-group">
                        <span className="c6-data-label">Valor Principal</span>
                        <span className="c6-data-value">{formatCurrency(selectedContract.principal)}</span>
                      </div>
                      
                      <div className="c6-data-group">
                        <span className="c6-data-label">Parcelas</span>
                        <span className="c6-data-value">
                          {selectedContract.installments_count || selectedContract.installments || 1}x de {formatCurrency(selectedContract.monthly_installment || selectedContract.principal)}
                        </span>
                      </div>
                      
                      <div className="c6-data-group c6-data-highlight">
                        <span className="c6-data-label">Total a Pagar</span>
                        <span className="c6-data-value text-gold">
                          {formatCurrency(selectedContract.total_amount || selectedContract.total_original || selectedContract.principal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Lista Dinâmica de Parcelas */}
                  <div className="c6-payments-section">
                    <div className="c6-payments-header">
                      <h3 className="c6-section-title">Cronograma de Parcelas</h3>
                      <span className="c6-installments-counter">
                        {contractPayments.length} baixa(s) registrada(s)
                      </span>
                    </div>

                {/* Lista de Parcelas */}
                <div className="c6-installments-list">
                  {getInstallmentsData().map(inst => {
                    const isPaid = inst.status === 'paid';
                    const isExpanded = isPaid ? !!expandedPaidInstallments[inst.number] : true;

                    // Se estiver PAGA e RECOLHIDA (Default): renderiza a linha compacta
                    if (isPaid && !isExpanded) {
                      return (
                        <div 
                          key={inst.number} 
                          className="c6-installment-card c6-inst-paid c6-inst-collapsed"
                          onClick={() => toggleExpandInstallment(inst.number)}
                          role="button"
                          tabIndex={0}
                          title="Clique para ver os detalhes da parcela quitada"
                        >
                          <div className="c6-inst-collapsed-left">
                            <span className="c6-inst-badge-num">
                              Parcela {inst.number}/{inst.totalCount}
                            </span>
                            <span className="c6-inst-due-date">
                              Vencimento: <strong>{formatDate(inst.dueDate)}</strong>
                            </span>
                          </div>
                          <div className="c6-inst-collapsed-right">
                            <span className="c6-badge c6-badge-paga">
                              PAGA
                            </span>
                            <ChevronDown size={16} className="c6-inst-chevron" />
                          </div>
                        </div>
                      );
                    }

                    // Card Expandido (Parcelas Pendentes, Atrasadas ou Parcelas Pagas Abertas)
                    return (
                      <div 
                        key={inst.number} 
                        className={`c6-installment-card ${isPaid ? 'c6-inst-paid' : inst.status === 'partial' ? 'c6-inst-partial' : inst.isOverdue ? 'c6-inst-overdue' : ''}`}
                      >
                        {/* Cabeçalho do Card da Parcela */}
                        <div 
                          className={`c6-inst-header ${isPaid ? 'c6-inst-header-clickable' : ''}`}
                          onClick={isPaid ? () => toggleExpandInstallment(inst.number) : undefined}
                          title={isPaid ? "Clique para recolher" : undefined}
                        >
                          <div className="c6-inst-title-group">
                            <span className="c6-inst-badge-num">
                              Parcela {inst.number}/{inst.totalCount}
                            </span>
                            <span className="c6-inst-due-date">
                              Vencimento: <strong>{formatDate(inst.dueDate)}</strong>
                            </span>
                          </div>
                          <div className="c6-inst-header-right">
                            <span className={`c6-badge ${inst.badgeClass}`}>
                              {inst.statusLabel}
                            </span>
                            {isPaid && (
                              <ChevronUp size={16} className="c6-inst-chevron" />
                            )}
                          </div>
                        </div>

                        {/* Grade de Valores da Parcela */}
                        <div className="c6-inst-grid">
                          <div className="c6-inst-mini-card">
                            <span className="c6-data-label">Valor Original</span>
                            <span className="c6-data-value">{formatCurrency(inst.monthlyInstallment)}</span>
                          </div>

                          <div className={`c6-inst-mini-card ${isPaid ? 'c6-inst-mini-card--paid' : inst.isOverdue ? 'c6-inst-mini-card--overdue' : 'c6-inst-mini-card--due'}`}>
                            <span className="c6-data-label">
                              {isPaid 
                                ? 'Situação' 
                                : inst.isOverdue 
                                  ? 'Saldo c/ Juros' 
                                  : inst.totalPaid > 0 
                                    ? 'Saldo Restante' 
                                    : 'Valor a Pagar'}
                            </span>
                            <span className={`c6-data-value ${isPaid ? 'text-green' : inst.isOverdue ? 'text-red' : 'text-gold'}`}>
                              {isPaid ? 'Quitada' : formatCurrency(inst.totalDue)}
                            </span>
                          </div>

                          {inst.totalPaid > 0 && (
                            <div className="c6-inst-mini-card c6-inst-mini-card--paid c6-inst-mini-card--paid-full-width">
                              <span className="c6-data-label">Total Já Pago (Amortizado)</span>
                              <span className="c6-data-value text-green font-bold">{formatCurrency(inst.totalPaid)}</span>
                            </div>
                          )}
                        </div>

                        {/* Nota explicativa de atraso caso incida multa/juros sobre saldo */}
                        {inst.isOverdue && (
                          <div className="c6-inst-penalty-alert">
                            <span>
                              ⚠️ <strong>{inst.daysOverdue} {inst.daysOverdue === 1 ? 'dia' : 'dias'} de atraso:</strong> Multa (+{formatCurrency(inst.penaltyAmount)}) e Juros (+{formatCurrency(inst.totalDailyInterest)}) calculados estritamente sobre o saldo devedor restante de {formatCurrency(inst.remainingPrincipal)}.
                            </span>
                          </div>
                        )}

                        {/* Histórico de Baixas desta Parcela */}
                        {inst.payments.length > 0 && (
                          <div className="c6-inst-payments-mini">
                            <span className="c6-mini-title">Baixas registradas nesta parcela:</span>
                            <div className="c6-mini-tags">
                              {inst.payments.map((p, idx) => (
                                <span key={p.id || idx} className="c6-mini-tag">
                                  {formatDate(p.payment_date)} — {formatCurrency(p.amount)} ({p.payment_method?.toUpperCase() || 'PIX'})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Ação da Parcela */}
                        <div className="c6-inst-footer">
                          {isPaid ? (
                            <div className="c6-inst-status-done">
                              <CheckCircle2 size={16} color="#10B981" />
                              <span>Parcela 100% Paga</span>
                            </div>
                          ) : (
                            <div className="c6-inst-actions-row">
                              {/* Botão de Cobrança WhatsApp (Lado Esquerdo) */}
                              <button 
                                className="c6-btn-wpp-charge"
                                onClick={() => handleCobrarParcela(selectedClient, inst)}
                                title="Cobrar Parcela via WhatsApp"
                              >
                                <img src="/whatsapp.svg" alt="WhatsApp" width="16" height="16" />
                                <span>Cobrar</span>
                              </button>

                              {/* Botão de Pagamento / Baixa (Lado Direito) */}
                              <button 
                                className="c6-action-btn c6-action-btn--pay"
                                onClick={() => handleOpenPayInstallment(inst)}
                              >
                                <DollarSign size={16} />
                                <span>{inst.totalPaid > 0 ? 'Pagar Saldo' : 'Registrar Pagamento'}</span>
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )}

      {/* Modal de Sucesso Customizado C6 Carbon */}
      {showSuccessModal && successModalData && (
        <div className="c6-success-modal-overlay" onClick={handleCloseSuccessModal}>
          <div className="c6-success-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="c6-success-icon-badge">
              <Check size={38} color="#10B981" strokeWidth={3} />
            </div>

            <h3 className="c6-success-title">Pagamento Registrado!</h3>
            <p className="c6-success-subtitle">
              A baixa da parcela foi processada e salva no sistema com sucesso.
            </p>

            <div className="c6-success-summary-box">
              <div className="c6-success-summary-row">
                <span className="label">Valor Recebido</span>
                <span className="value text-green font-bold">{formatCurrency(successModalData.amount)}</span>
              </div>
              <div className="c6-success-summary-row">
                <span className="label">Parcela</span>
                <span className="value font-bold">{successModalData.installment_number} de {successModalData.total_installments}</span>
              </div>
              <div className="c6-success-summary-row">
                <span className="label">Forma de Pagamento</span>
                <span className="value">{successModalData.payment_method?.toUpperCase()}</span>
              </div>
              <div className="c6-success-summary-row">
                <span className="label">Data da Baixa</span>
                <span className="value">{formatDate(successModalData.payment_date)}</span>
              </div>
              {successModalData.client_name && (
                <div className="c6-success-summary-row">
                  <span className="label">Cliente</span>
                  <span className="value font-bold">{successModalData.client_name}</span>
                </div>
              )}
            </div>

            <button 
              type="button" 
              className="c6-success-btn-ok"
              onClick={handleCloseSuccessModal}
              autoFocus
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Modal de Saque C6 Carbon */}
      {showSaqueModal && selectedSavingsClient && (
        <ModalSaque
          isOpen={showSaqueModal}
          onClose={() => {
            setShowSaqueModal(false);
            setSelectedSavingsClient(null);
          }}
          client={selectedSavingsClient}
          currentBalance={getClientSavingsBalance(selectedSavingsClient.id)}
          onSuccess={async () => {
            await fetchAllData();
          }}
        />
      )}

      {/* Central / Modal de Depósitos e Extrato C6 Carbon */}
      {showDepositosModal && selectedSavingsClient && (
        <ModalDepositos
          isOpen={showDepositosModal}
          onClose={() => {
            setShowDepositosModal(false);
            setSelectedSavingsClient(null);
          }}
          client={selectedSavingsClient}
          onBalanceUpdate={async () => {
            await fetchAllData();
          }}
        />
      )}
    </div>
  );
};

export default ListaClientes;
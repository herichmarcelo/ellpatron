import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Search, Eye, Edit, Download, Printer, Trash2, X, Clock, 
  CheckCircle, AlertTriangle, MessageCircle, Calendar, DollarSign, 
  Percent, User, Ban, Check, ShieldAlert, ChevronRight, Phone
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { formatCurrency, formatDate, formatCPF, formatPhone } from '../utils/formatters';
import { getContracts, updateContract, deleteContract } from '../supabase/services';
import { exportContractsPDF, exportContractsExcel, exportSingleContractPDF } from '../utils/exportUtils';
import { useClients } from '../hooks/useClients';
import './HistoricoContratos.css';

const HistoricoContratos = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Status Change Custom Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [contractToEditStatus, setContractToEditStatus] = useState(null);
  const [selectedStatusToUpdate, setSelectedStatusToUpdate] = useState('open');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete Confirmation Custom Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [deletingContract, setDeletingContract] = useState(false);

  const { clients = [] } = useClients();

  const refreshContracts = () => {
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
        } else {
          console.error('Error loading contracts:', result.error);
          setContracts([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Error loading contracts:', error);
        setContracts([]);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalCount = contracts.length;
  const openCount = contracts.filter(c => c.status === 'open').length;
  const paidCount = contracts.filter(c => c.status === 'paid').length;
  const overdueCount = contracts.filter(c => c.status === 'overdue' || (new Date(c.due_date) < new Date() && c.status === 'open')).length;
  const cancelledCount = contracts.filter(c => c.status === 'cancelled').length;

  const filteredContracts = useMemo(() => {
    const queryStr = typeof searchQuery === 'string' ? searchQuery : (searchQuery?.target?.value || '');
    const query = queryStr.toLowerCase().trim();
    return contracts.filter(contract => {
      const matchesSearch = 
        !query ||
        (contract.client_name && contract.client_name.toLowerCase().includes(query)) ||
        (contract.client_cpf && contract.client_cpf.includes(query)) ||
        (contract.protocol_number && contract.protocol_number.toLowerCase().includes(query));
      
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  const getClientPhone = (contract) => {
    if (contract.client_phone) return contract.client_phone;
    const matchedClient = clients.find(
      cl => (cl.cpf && contract.client_cpf && cl.cpf.replace(/\D/g, '') === contract.client_cpf.replace(/\D/g, '')) ||
            (cl.name && contract.client_name && cl.name.toLowerCase().trim() === contract.client_name.toLowerCase().trim())
    );
    return matchedClient?.phone || '';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge variant="gold" className="c6-status-badge">Em aberto</Badge>;
      case 'paid':
        return <Badge variant="green" className="c6-status-badge">Pago</Badge>;
      case 'overdue':
        return <Badge variant="red" className="c6-status-badge">Em atraso</Badge>;
      case 'cancelled':
        return <Badge variant="dark" className="c6-status-badge">Cancelado</Badge>;
      default:
        return <Badge variant="ghost" className="c6-status-badge">{status}</Badge>;
    }
  };

  const handleWhatsApp = (contract) => {
    const phone = getClientPhone(contract);
    const rawPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${contract.client_name}, referente ao contrato *${contract.protocol_number}* no valor de *${formatCurrency(contract.total_amount || contract.total_original || contract.principal)}* com vencimento em *${formatDate(contract.due_date)}*. Como podemos ajudar?`
    );

    if (rawPhone) {
      window.open(`https://wa.me/55${rawPhone}?text=${message}`, '_blank');
    } else {
      const phoneInput = prompt(`Telefone de ${contract.client_name} não encontrado no cadastro. Digite o WhatsApp com DDD (ex: 11999999999):`);
      if (phoneInput) {
        window.open(`https://wa.me/55${phoneInput.replace(/\D/g, '')}?text=${message}`, '_blank');
      }
    }
  };

  const handleView = (contract) => {
    setSelectedContract(contract);
    setShowViewModal(true);
  };

  const handleOpenStatusModal = (contract) => {
    setContractToEditStatus(contract);
    setSelectedStatusToUpdate(contract.status || 'open');
    setShowStatusModal(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!contractToEditStatus) return;
    setUpdatingStatus(true);
    try {
      const result = await updateContract(contractToEditStatus.id, { status: selectedStatusToUpdate });
      if (result.success) {
        refreshContracts();
        setShowStatusModal(false);
        setContractToEditStatus(null);
        if (selectedContract && selectedContract.id === contractToEditStatus.id) {
          setSelectedContract(prev => ({ ...prev, status: selectedStatusToUpdate }));
        }
      } else {
        alert('Erro ao atualizar status: ' + result.error);
      }
    } catch (err) {
      alert('Erro inesperado: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenDeleteModal = (contract) => {
    setContractToDelete(contract);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!contractToDelete) return;
    setDeletingContract(true);
    try {
      const result = await deleteContract(contractToDelete.id);
      if (result.success) {
        refreshContracts();
        setShowDeleteModal(false);
        setContractToDelete(null);
        if (selectedContract && selectedContract.id === contractToDelete.id) {
          setShowViewModal(false);
          setSelectedContract(null);
        }
      } else {
        alert('Erro ao excluir contrato: ' + result.error);
      }
    } catch (err) {
      alert('Erro inesperado: ' + err.message);
    } finally {
      setDeletingContract(false);
    }
  };

  const handleExportPDF = () => {
    exportContractsPDF(filteredContracts);
  };

  const handleExportExcel = () => {
    exportContractsExcel(filteredContracts);
  };

  const handleDownloadSinglePDF = () => {
    if (!selectedContract) return;
    exportSingleContractPDF(selectedContract);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="historico-contratos">
        <div className="loading-screen">
          <div className="c6-loading-spinner" />
          <span>Carregando contratos Carbon...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="historico-contratos">
      {/* 1. HEADER C6 CARBON */}
      <div className="historico-contratos-header">
        <div className="historico-contratos-title">
          <div className="historico-title-icon-wrapper">
            <FileText size={24} className="gold-icon" />
          </div>
          <div>
            <h2>Histórico de Contratos</h2>
            <span className="historico-subtitle">Gestão e controle financeiro de emissões</span>
          </div>
        </div>

        <div className="historico-contratos-actions">
          <Button
            variant="secondary"
            size="small"
            icon={Download}
            onClick={handleExportPDF}
            className="c6-btn-action"
          >
            Exportar PDF
          </Button>
          <Button
            variant="secondary"
            size="small"
            icon={Download}
            onClick={handleExportExcel}
            className="c6-btn-action"
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* 2. KPI CARDS ANALÍTICOS */}
      <div className="historico-contratos-kpi-grid">
        <Card className="historico-contratos-kpi-card">
          <div className="historico-contratos-kpi-content">
            <div className="historico-contratos-kpi-icon">
              <FileText size={22} />
            </div>
            <div>
              <span className="historico-contratos-kpi-label">Total Cadastrados</span>
              <span className="historico-contratos-kpi-value text-gold">{totalCount}</span>
            </div>
          </div>
        </Card>

        <Card className="historico-contratos-kpi-card">
          <div className="historico-contratos-kpi-content">
            <div className="historico-contratos-kpi-icon historico-contratos-kpi-icon--blue">
              <Clock size={22} />
            </div>
            <div>
              <span className="historico-contratos-kpi-label">Em Aberto</span>
              <span className="historico-contratos-kpi-value text-blue">{openCount}</span>
            </div>
          </div>
        </Card>

        <Card className="historico-contratos-kpi-card">
          <div className="historico-contratos-kpi-content">
            <div className="historico-contratos-kpi-icon historico-contratos-kpi-icon--green">
              <CheckCircle size={22} />
            </div>
            <div>
              <span className="historico-contratos-kpi-label">Quitados</span>
              <span className="historico-contratos-kpi-value text-green">{paidCount}</span>
            </div>
          </div>
        </Card>

        <Card className="historico-contratos-kpi-card">
          <div className="historico-contratos-kpi-content">
            <div className="historico-contratos-kpi-icon historico-contratos-kpi-icon--red">
              <AlertTriangle size={22} />
            </div>
            <div>
              <span className="historico-contratos-kpi-label">Em Atraso</span>
              <span className="historico-contratos-kpi-value text-red">{overdueCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. FILTROS RÁPIDOS & CONTROLES */}
      <div className="historico-contratos-controls">
        <div className="historico-contratos-search">
          <Input
            placeholder="Buscar por cliente, CPF ou protocolo..."
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

        {/* Status Pills / Quick Chips */}
        <div className="historico-filter-chips">
          <button 
            className={`c6-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Todos <span className="c6-pill-count">{totalCount}</span>
          </button>
          <button 
            className={`c6-filter-pill c6-filter-pill--gold ${statusFilter === 'open' ? 'active' : ''}`}
            onClick={() => setStatusFilter('open')}
          >
            Em Aberto <span className="c6-pill-count">{openCount}</span>
          </button>
          <button 
            className={`c6-filter-pill c6-filter-pill--green ${statusFilter === 'paid' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paid')}
          >
            Quitados <span className="c6-pill-count">{paidCount}</span>
          </button>
          <button 
            className={`c6-filter-pill c6-filter-pill--red ${statusFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => setStatusFilter('overdue')}
          >
            Em Atraso <span className="c6-pill-count">{overdueCount}</span>
          </button>
          <button 
            className={`c6-filter-pill c6-filter-pill--dark ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            Cancelados <span className="c6-pill-count">{cancelledCount}</span>
          </button>
        </div>
      </div>

      {/* 4. CONTEÚDO: DESKTOP TABLE + MOBILE CARBON CARDS */}
      <div className="historico-contratos-content">
        {filteredContracts.length === 0 ? (
          <Card className="historico-contratos-empty">
            <div className="empty-state-content">
              <FileText size={48} className="empty-icon" />
              <h3>Nenhum contrato encontrado</h3>
              <p>Tente ajustar os filtros ou o termo de busca para visualizar os contratos.</p>
              {searchQuery && (
                <Button variant="ghost" size="small" onClick={() => setSearchQuery('')}>
                  Limpar busca
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            {/* === DESKTOP TABLE VIEW (Visível em telas > 768px) === */}
            <div className="historico-contratos-desktop-view">
              <Card className="historico-contratos-table-container">
                <table className="historico-contratos-table">
                  <thead>
                    <tr>
                      <th>Nº Contrato</th>
                      <th>Cliente</th>
                      <th>CPF</th>
                      <th>Valor Principal</th>
                      <th>Parcelas</th>
                      <th>Total</th>
                      <th>Empréstimo</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                      <th className="th-actions">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => (
                      <tr key={contract.id} className="historico-table-row">
                        <td className="contract-protocol">
                          <span className="protocol-badge">{contract.protocol_number}</span>
                        </td>
                        <td className="contract-client">
                          <div className="client-cell">
                            <span className="client-name">{contract.client_name}</span>
                          </div>
                        </td>
                        <td className="contract-cpf">{formatCPF(contract.client_cpf)}</td>
                        <td className="contract-value">{formatCurrency(contract.principal)}</td>
                        <td className="contract-interest">
                          {contract.installments_count || 1}x {formatCurrency(contract.monthly_installment || contract.principal)}
                        </td>
                        <td className="contract-total">
                          {formatCurrency(contract.total_amount || contract.total_original || contract.principal)}
                        </td>
                        <td className="contract-date">{formatDate(contract.loan_date)}</td>
                        <td className="contract-date">{formatDate(contract.due_date)}</td>
                        <td className="contract-status">{getStatusBadge(contract.status)}</td>
                        <td className="contract-actions">
                          <div className="contract-actions-buttons">
                            <button
                              className="c6-icon-btn c6-icon-btn--view"
                              onClick={() => handleView(contract)}
                              title="Visualizar Detalhes"
                              aria-label="Visualizar Detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="c6-icon-btn c6-icon-btn--wpp"
                              onClick={() => handleWhatsApp(contract)}
                              title="WhatsApp"
                              aria-label="WhatsApp"
                            >
                              <img src="/whatsapp.svg" alt="WhatsApp" className="wpp-icon-img" />
                            </button>
                            <button
                              className="c6-icon-btn c6-icon-btn--edit"
                              onClick={() => handleOpenStatusModal(contract)}
                              title="Alterar Status"
                              aria-label="Alterar Status"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="c6-icon-btn c6-icon-btn--delete"
                              onClick={() => handleOpenDeleteModal(contract)}
                              title="Excluir Contrato"
                              aria-label="Excluir Contrato"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* === MOBILE CARDS VIEW (Visível em telas <= 768px) === */}
            <div className="historico-contratos-mobile-view">
              <div className="historico-cards-grid">
                {filteredContracts.map((contract) => {
                  const phone = getClientPhone(contract);
                  return (
                    <Card key={contract.id} className="contract-carbon-card">
                      {/* Top Header */}
                      <div className="carbon-card-header">
                        <div className="carbon-card-protocol-group">
                          <span className="carbon-protocol-tag">
                            {contract.protocol_number}
                          </span>
                          {getStatusBadge(contract.status)}
                        </div>

                        {phone && (
                          <button
                            className="carbon-wpp-direct-btn"
                            onClick={() => handleWhatsApp(contract)}
                            title="Conversar no WhatsApp"
                            aria-label="WhatsApp"
                          >
                            <img src="/whatsapp.svg" alt="WhatsApp" className="wpp-icon-img" />
                          </button>
                        )}
                      </div>

                      {/* Client Info */}
                      <div className="carbon-card-client-section">
                        <div className="carbon-client-info">
                          <h3 className="carbon-client-name">{contract.client_name}</h3>
                          <div className="carbon-client-subdetails">
                            <span className="carbon-cpf-pill">CPF: {formatCPF(contract.client_cpf)}</span>
                            {phone && <span className="carbon-phone-pill">{formatPhone(phone)}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Financial Box Breakdown */}
                      <div className="carbon-financial-box">
                        <div className="carbon-fin-row">
                          <div className="carbon-fin-item">
                            <span className="carbon-fin-label">Valor Principal</span>
                            <span className="carbon-fin-val">{formatCurrency(contract.principal)}</span>
                          </div>
                          <div className="carbon-fin-item">
                            <span className="carbon-fin-label">Parcelas</span>
                            <span className="carbon-fin-val font-accent">
                              {contract.installments_count || 1}x de {formatCurrency(contract.monthly_installment || contract.principal)}
                            </span>
                          </div>
                        </div>

                        <div className="carbon-fin-divider" />

                        <div className="carbon-fin-row carbon-fin-row--total">
                          <div className="carbon-fin-item">
                            <span className="carbon-fin-label">Total do Contrato</span>
                            <span className="carbon-fin-val carbon-fin-val--total">
                              {formatCurrency(contract.total_amount || contract.total_original || contract.principal)}
                            </span>
                          </div>
                          <div className="carbon-fin-item">
                            <span className="carbon-fin-label">Taxa Mensal</span>
                            <span className="carbon-fin-val">
                              {contract.interest_rate_month || contract.interest_rate || 1.25}% a.m.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Dates Row */}
                      <div className="carbon-dates-row">
                        <div className="carbon-date-badge">
                          <Calendar size={13} />
                          <span>Emissão: <strong>{formatDate(contract.loan_date)}</strong></span>
                        </div>
                        <div className="carbon-date-badge carbon-date-badge--due">
                          <Clock size={13} />
                          <span>Vencimento: <strong>{formatDate(contract.due_date)}</strong></span>
                        </div>
                      </div>

                      {/* Mobile Actions Grid */}
                      <div className="carbon-actions-grid">
                        <button
                          className="carbon-action-btn carbon-action-btn--view"
                          onClick={() => handleView(contract)}
                        >
                          <Eye size={15} /> Detalhes
                        </button>
                        <button
                          className="carbon-action-btn carbon-action-btn--status"
                          onClick={() => handleOpenStatusModal(contract)}
                        >
                          <Edit size={15} /> Status
                        </button>
                        <button
                          className="carbon-action-btn carbon-action-btn--pdf"
                          onClick={() => exportSingleContractPDF(contract)}
                        >
                          <Download size={15} /> PDF
                        </button>
                        <button
                          className="carbon-action-btn carbon-action-btn--delete"
                          onClick={() => handleOpenDeleteModal(contract)}
                        >
                          <Trash2 size={15} /> Excluir
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 5. MODAL DE VISUALIZAÇÃO DETALHADA C6 CARBON */}
      {showViewModal && selectedContract && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <Card className="c6-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="c6-modal-header">
              <div className="c6-modal-title-box">
                <FileText size={22} className="gold-icon" />
                <div>
                  <h3>Contrato {selectedContract.protocol_number}</h3>
                  <span className="c6-modal-subtitle">Detalhamento completo do contrato</span>
                </div>
              </div>
              <button 
                className="c6-modal-close-btn" 
                onClick={() => setShowViewModal(false)}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="c6-modal-body">
              {/* Seção 1: Dados do Cliente */}
              <div className="c6-modal-section">
                <div className="c6-modal-section-title">
                  <User size={16} />
                  <h4>Dados do Cliente</h4>
                </div>
                <div className="c6-modal-grid">
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Cliente</span>
                    <span className="c6-field-value">{selectedContract.client_name}</span>
                  </div>
                  <div className="c6-modal-field">
                    <span className="c6-field-label">CPF</span>
                    <span className="c6-field-value font-mono">{formatCPF(selectedContract.client_cpf)}</span>
                  </div>
                  {getClientPhone(selectedContract) && (
                    <div className="c6-modal-field">
                      <span className="c6-field-label">Telefone / WhatsApp</span>
                      <span className="c6-field-value font-mono">{formatPhone(getClientPhone(selectedContract))}</span>
                    </div>
                  )}
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Status Atual</span>
                    <div>{getStatusBadge(selectedContract.status)}</div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Condições Financeiras */}
              <div className="c6-modal-section">
                <div className="c6-modal-section-title">
                  <DollarSign size={16} />
                  <h4>Condições Financeiras</h4>
                </div>
                <div className="c6-modal-grid">
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Valor Principal</span>
                    <span className="c6-field-value text-gold">{formatCurrency(selectedContract.principal)}</span>
                  </div>
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Parcelamento</span>
                    <span className="c6-field-value">
                      {selectedContract.installments_count || 1}x de {formatCurrency(selectedContract.monthly_installment || selectedContract.principal)}
                    </span>
                  </div>
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Taxa Mensal</span>
                    <span className="c6-field-value">
                      {selectedContract.interest_rate_month || selectedContract.interest_rate || 1.25}% a.m.
                    </span>
                  </div>
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Total do Contrato</span>
                    <span className="c6-field-value text-gold font-bold">
                      {formatCurrency(selectedContract.total_amount || selectedContract.total_original || selectedContract.principal)}
                    </span>
                  </div>
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Multa por Atraso</span>
                    <span className="c6-field-value text-red">{selectedContract.late_fee_percentage || 10}%</span>
                  </div>
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Juros Diários</span>
                    <span className="c6-field-value text-red">{selectedContract.daily_late_interest_percentage || 1}% ao dia</span>
                  </div>
                </div>
              </div>

              {/* Seção 3: Prazos e Vigência */}
              <div className="c6-modal-section">
                <div className="c6-modal-section-title">
                  <Calendar size={16} />
                  <h4>Prazos e Datas</h4>
                </div>
                <div className="c6-modal-grid">
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Data de Concessão</span>
                    <span className="c6-field-value">{formatDate(selectedContract.loan_date)}</span>
                  </div>
                  <div className="c6-modal-field">
                    <span className="c6-field-label">Data de Vencimento</span>
                    <span className="c6-field-value">{formatDate(selectedContract.due_date)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="c6-modal-footer">
              <div className="c6-modal-footer-left">
                {getClientPhone(selectedContract) && (
                  <Button 
                    variant="ghost" 
                    onClick={() => handleWhatsApp(selectedContract)}
                    className="c6-modal-btn-wpp"
                  >
                    <img src="/whatsapp.svg" alt="WhatsApp" className="wpp-icon-img-inline" />
                    WhatsApp
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  icon={Edit} 
                  onClick={() => {
                    handleOpenStatusModal(selectedContract);
                  }}
                >
                  Alterar Status
                </Button>
              </div>

              <div className="c6-modal-footer-right">
                <Button variant="secondary" icon={Printer} onClick={handlePrint}>
                  Imprimir
                </Button>
                <Button variant="primary" icon={Download} onClick={handleDownloadSinglePDF}>
                  Baixar PDF Oficial
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 6. MODAL DE ALTERAÇÃO DE STATUS C6 CARBON */}
      {showStatusModal && contractToEditStatus && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <Card className="c6-modal-content c6-modal-content--status" onClick={(e) => e.stopPropagation()}>
            <div className="c6-modal-header">
              <div className="c6-modal-title-box">
                <Edit size={20} className="gold-icon" />
                <div>
                  <h3>Alterar Status do Contrato</h3>
                  <span className="c6-modal-subtitle">Protocolo: {contractToEditStatus.protocol_number}</span>
                </div>
              </div>
              <button 
                className="c6-modal-close-btn" 
                onClick={() => setShowStatusModal(false)}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="c6-modal-body">
              <p className="c6-status-intro">
                Selecione o novo status operacional para o contrato de <strong>{contractToEditStatus.client_name}</strong>:
              </p>

              <div className="c6-status-options-grid">
                {/* Opção Em Aberto */}
                <div 
                  className={`c6-status-option ${selectedStatusToUpdate === 'open' ? 'selected c6-status-option--open' : ''}`}
                  onClick={() => setSelectedStatusToUpdate('open')}
                >
                  <div className="c6-status-option-radio">
                    {selectedStatusToUpdate === 'open' && <div className="c6-radio-dot" />}
                  </div>
                  <div className="c6-status-option-info">
                    <span className="c6-status-option-title text-gold">Em Aberto</span>
                    <span className="c6-status-option-desc">Contrato ativo aguardando pagamento conforme vencimento</span>
                  </div>
                </div>

                {/* Opção Quitado */}
                <div 
                  className={`c6-status-option ${selectedStatusToUpdate === 'paid' ? 'selected c6-status-option--paid' : ''}`}
                  onClick={() => setSelectedStatusToUpdate('paid')}
                >
                  <div className="c6-status-option-radio">
                    {selectedStatusToUpdate === 'paid' && <div className="c6-radio-dot" />}
                  </div>
                  <div className="c6-status-option-info">
                    <span className="c6-status-option-title text-green">Pago / Quitado</span>
                    <span className="c6-status-option-desc">Todas as parcelas ou o valor integral foram quitados</span>
                  </div>
                </div>

                {/* Opção Em Atraso */}
                <div 
                  className={`c6-status-option ${selectedStatusToUpdate === 'overdue' ? 'selected c6-status-option--overdue' : ''}`}
                  onClick={() => setSelectedStatusToUpdate('overdue')}
                >
                  <div className="c6-status-option-radio">
                    {selectedStatusToUpdate === 'overdue' && <div className="c6-radio-dot" />}
                  </div>
                  <div className="c6-status-option-info">
                    <span className="c6-status-option-title text-red">Em Atraso</span>
                    <span className="c6-status-option-desc">Vencimento expirado sem quitação. Sujeito a multa e juros</span>
                  </div>
                </div>

                {/* Opção Cancelado */}
                <div 
                  className={`c6-status-option ${selectedStatusToUpdate === 'cancelled' ? 'selected c6-status-option--cancelled' : ''}`}
                  onClick={() => setSelectedStatusToUpdate('cancelled')}
                >
                  <div className="c6-status-option-radio">
                    {selectedStatusToUpdate === 'cancelled' && <div className="c6-radio-dot" />}
                  </div>
                  <div className="c6-status-option-info">
                    <span className="c6-status-option-title text-muted">Cancelado</span>
                    <span className="c6-status-option-desc">Contrato rescindido, anulado ou arquivado</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="c6-modal-footer">
              <Button variant="ghost" onClick={() => setShowStatusModal(false)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConfirmStatusUpdate}
                disabled={updatingStatus}
              >
                {updatingStatus ? 'Salvando...' : 'Salvar Alteração'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 7. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO C6 CARBON */}
      {showDeleteModal && contractToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <Card className="c6-modal-content c6-modal-content--delete" onClick={(e) => e.stopPropagation()}>
            <div className="c6-modal-header">
              <div className="c6-modal-title-box">
                <Trash2 size={20} className="text-red" />
                <div>
                  <h3 className="text-red">Confirmar Exclusão</h3>
                  <span className="c6-modal-subtitle">Ação irreversível</span>
                </div>
              </div>
              <button 
                className="c6-modal-close-btn" 
                onClick={() => setShowDeleteModal(false)}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="c6-modal-body">
              <p className="c6-delete-warning">
                Tem certeza que deseja excluir permanentemente o contrato{' '}
                <strong className="text-gold">{contractToDelete.protocol_number}</strong> do cliente{' '}
                <strong>{contractToDelete.client_name}</strong>?
              </p>
              <div className="c6-delete-details">
                <span>Valor: {formatCurrency(contractToDelete.total_amount || contractToDelete.principal)}</span>
                <span>Vencimento: {formatDate(contractToDelete.due_date)}</span>
              </div>
            </div>

            <div className="c6-modal-footer">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <Button 
                variant="danger" 
                onClick={handleConfirmDelete}
                disabled={deletingContract}
              >
                {deletingContract ? 'Excluindo...' : 'Excluir Contrato'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HistoricoContratos;

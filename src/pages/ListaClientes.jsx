import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Edit, Eye, Phone, MapPin, Calendar, FileText, Plus, Download, ShieldAlert, Ban } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { useClients, useAddToBlacklist, useRemoveFromBlacklist, isClientBlacklisted } from '../hooks/useClients';
import { formatPhone, formatDate, formatCPF, getInitials, stringToColor, formatAddress, formatCurrency } from '../utils/formatters';
import { getContracts, getPayments, createPayment } from '../supabase/services.js';
import { exportClientsExcel } from '../utils/exportUtils';
import './ListaClientes.css';

const ListaClientes = () => {
  const navigate = useNavigate();
  const { mutate: addToBlacklist } = useAddToBlacklist();
  const { mutate: removeFromBlacklist } = useRemoveFromBlacklist();
  
  const { blacklist, getClientStats, searchClients, getClientById } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientContracts, setClientContracts] = useState([]);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractPayments, setContractPayments] = useState([]);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  const [newPayment, setNewPayment] = useState({
    installment_number: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'pix',
    notes: ''
  });

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

  const handleAddToBlacklist = (clientId) => {
    const client = getClientById(clientId);
    if (client) {
      const reason = prompt('Motivo para adicionar à lista negra:');
      if (reason) {
        addToBlacklist({ clientId, reason });
      }
    }
  };

  const handleRemoveFromBlacklist = (blacklistId) => {
    if (confirm('Tem certeza que deseja remover da lista negra?')) {
      removeFromBlacklist(blacklistId);
    }
  };

  const handleWhatsAppClick = (phone) => {
    const message = encodeURIComponent('Olá! Como posso ajudar?');
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
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

  const handleAddPayment = async () => {
    try {
      const paymentData = {
        contract_id: selectedContract.id,
        contract_protocol: selectedContract.protocol_number,
        installment_number: parseInt(newPayment.installment_number) || 1,
        amount: parseFloat(newPayment.amount) || 0,
        payment_date: newPayment.payment_date,
        payment_method: newPayment.payment_method,
        notes: newPayment.notes
      };

      const result = await createPayment(paymentData);
      
      if (result.success) {
        alert('Pagamento registrado com sucesso!');
        const paymentsResult = await getPayments({ contractProtocol: selectedContract.protocol_number });
        if (paymentsResult.success) {
          setContractPayments(paymentsResult.data || []);
        }
        setNewPayment({
          installment_number: '',
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'pix',
          notes: ''
        });
        setShowAddPaymentForm(false);
      } else {
        alert('Erro ao registrar pagamento: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Erro ao registrar pagamento: ' + error.message);
    }
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
      <div className="lista-clientes-header">
        <div className="lista-clientes-title">
          <UserPlus size={24} />
          <h2>Lista de Clientes</h2>
        </div>
        
        <div className="lista-clientes-actions-top">
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExportExcel}
          >
            Exportar Excel
          </Button>
          <Button
            variant="primary"
            icon={UserPlus}
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
            onChange={setSearchQuery}
            fullWidth
          />
        </div>
        
        <div className="lista-clientes-filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="lista-clientes-filter-select"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="blacklisted">Lista Negra</option>
          </select>
        </div>
      </div>

      <div className="lista-clientes-content">
        {filteredClients.length === 0 ? (
          <Card className="lista-clientes-empty">
            <p>Nenhum cliente encontrado.</p>
          </Card>
        ) : (
          <div className="lista-clientes-grid">
            {filteredClients.map((client) => (
              <Card key={client.id} className="lista-clientes-card">
                <div className="lista-clientes-card-header">
                  <div 
                    className="lista-clientes-avatar"
                    style={{ backgroundColor: stringToColor(client.name) }}
                  >
                    {getInitials(client.name)}
                  </div>
                  <div className="lista-clientes-info">
                    <h3 className="lista-clientes-name">{client.name}</h3>
                    <div className="lista-clientes-meta">
                      {getStatusBadge(client.status)}
                    </div>
                  </div>
                </div>

                <div className="lista-clientes-details">
                  <div className="lista-clientes-detail">
                    <span className="lista-clientes-cpf">CPF: {formatCPF(client.cpf)}</span>
                  </div>
                  <div className="lista-clientes-detail">
                    <Phone size={16} className="lista-clientes-detail-icon" />
                    <span className="lista-clientes-detail-text">
                      {formatPhone(client.phone)}
                    </span>
                  </div>
                  
                  <div className="lista-clientes-detail">
                    <Calendar size={16} className="lista-clientes-detail-icon" />
                    <span className="lista-clientes-detail-text">
                      {formatDate(client.registrationDate || client.created_at)}
                    </span>
                  </div>

                  {(client.street || client.city) && (
                    <div className="lista-clientes-detail">
                      <MapPin size={16} className="lista-clientes-detail-icon" />
                      <span className="lista-clientes-detail-text">
                        {formatAddress(client)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="lista-clientes-actions">
                  {isClientBlacklisted(client.id, blacklist) ? (
                    <Button
                      variant="danger"
                      size="small"
                      icon={ShieldAlert}
                      onClick={() => handleRemoveFromBlacklist(client.id)}
                    >
                      Remover Lista Negra
                    </Button>
                  ) : (
                    <Button
                      variant="warning"
                      size="small"
                      icon={Ban}
                      onClick={() => handleAddToBlacklist(client.id)}
                    >
                      Bloquear
                    </Button>
                  )}
                  <Button
                    variant="success"
                    size="small"
                    icon={Phone}
                    onClick={() => handleWhatsAppClick(client.phone)}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    icon={FileText}
                    onClick={() => handleViewContracts(client)}
                  >
                    Contratos
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    icon={Edit}
                    onClick={() => handleEditClient(client.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    icon={Eye}
                    onClick={() => handleViewClient(client)}
                  >
                    Ver
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Client Details Modal */}
      {showClientDetailsModal && selectedClientDetails && (
        <div className="modal-overlay" onClick={() => setShowClientDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ficha Cadastral do Cliente</h3>
              <Button variant="ghost" size="small" onClick={() => setShowClientDetailsModal(false)}>
                ✕
              </Button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div 
                  className="lista-clientes-avatar"
                  style={{ backgroundColor: stringToColor(selectedClientDetails.name), width: '52px', height: '52px', fontSize: '18px' }}
                >
                  {getInitials(selectedClientDetails.name)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>{selectedClientDetails.name}</h3>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(selectedClientDetails.status)}</div>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">CPF:</span>
                <span className="detail-value">{formatCPF(selectedClientDetails.cpf)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Telefone / WhatsApp:</span>
                <span className="detail-value">{formatPhone(selectedClientDetails.phone)}</span>
              </div>
              {selectedClientDetails.email && (
                <div className="detail-row">
                  <span className="detail-label">E-mail:</span>
                  <span className="detail-value">{selectedClientDetails.email}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Endereço:</span>
                <span className="detail-value">{formatAddress(selectedClientDetails)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Data de Cadastro:</span>
                <span className="detail-value">{formatDate(selectedClientDetails.registrationDate || selectedClientDetails.created_at)}</span>
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="secondary"
                icon={FileText}
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

      {/* Contracts Modal */}
      {showContractsModal && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowContractsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Histórico de Contratos - {selectedClient.name}</h2>
              <Button variant="ghost" size="small" onClick={() => setShowContractsModal(false)}>
                ✕
              </Button>
            </div>
            <div className="modal-body">
              {clientContracts.length === 0 ? (
                <p>Nenhum contrato encontrado para este cliente.</p>
              ) : (
                <div className="contracts-list">
                  {clientContracts.map(contract => (
                    <Card key={contract.id} className="contract-item">
                      <div className="contract-info">
                        <h4>Contrato #{contract.protocol_number}</h4>
                        <p>Data: {new Date(contract.loan_date || contract.created_at).toLocaleDateString('pt-BR')}</p>
                        <p>Valor Principal: {formatCurrency(contract.principal)}</p>
                        <p>Parcelas: {contract.installments_count || 1}x de {formatCurrency(contract.monthly_installment || contract.principal)}</p>
                        <p>Total: {formatCurrency(contract.total_amount || contract.total_original || contract.principal)}</p>
                        <Badge variant={contract.status === 'open' ? 'green' : 'gray'}>
                          {contract.status === 'open' ? 'Em aberto' : contract.status === 'paid' ? 'Pago' : contract.status}
                        </Badge>
                      </div>
                      <Button 
                        variant="primary" 
                        size="small"
                        onClick={() => handleViewPayments(contract)}
                      >
                        Ver Pagamentos
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payments Modal */}
      {showPaymentsModal && selectedContract && (
        <div className="modal-overlay" onClick={() => setShowPaymentsModal(false)}>
          <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pagamentos - Contrato #{selectedContract.protocol_number}</h2>
              <Button variant="ghost" size="small" onClick={() => setShowPaymentsModal(false)}>
                ✕
              </Button>
            </div>
            <div className="modal-body">
              <div className="contract-summary">
                <Card className="contract-summary-card">
                  <h4>Resumo do Contrato</h4>
                  <p>Valor Principal: {formatCurrency(selectedContract.principal)}</p>
                  <p>Parcelas: {selectedContract.installments_count || 1}x de {formatCurrency(selectedContract.monthly_installment || selectedContract.principal)}</p>
                  <p>Total: {formatCurrency(selectedContract.total_amount || selectedContract.total_original || selectedContract.principal)}</p>
                </Card>
              </div>

              <div className="payments-header">
                <h3>Pagamentos Realizados</h3>
                <Button 
                  variant="primary" 
                  size="small"
                  icon={Plus}
                  onClick={() => setShowAddPaymentForm(!showAddPaymentForm)}
                >
                  {showAddPaymentForm ? 'Cancelar' : 'Registrar Pagamento'}
                </Button>
              </div>

              {showAddPaymentForm && (
                <Card className="add-payment-form">
                  <h4>Registrar Novo Pagamento</h4>
                  <div className="payment-form-grid">
                    <div>
                      <label>Parcela Nº</label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={newPayment.installment_number}
                        onChange={(value) => setNewPayment({...newPayment, installment_number: value})}
                        min="1"
                        max={selectedContract.installments_count || 12}
                      />
                    </div>
                    <div>
                      <label>Valor (R$)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newPayment.amount}
                        onChange={(value) => setNewPayment({...newPayment, amount: value})}
                      />
                    </div>
                    <div>
                      <label>Data</label>
                      <Input
                        type="date"
                        value={newPayment.payment_date}
                        onChange={(value) => setNewPayment({...newPayment, payment_date: value})}
                      />
                    </div>
                    <div>
                      <label>Método</label>
                      <select
                        value={newPayment.payment_method}
                        onChange={(e) => setNewPayment({...newPayment, payment_method: e.target.value})}
                        className="payment-method-select"
                      >
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="transferencia">Transferência</option>
                      </select>
                    </div>
                    <div>
                      <label>Observações</label>
                      <Input
                        placeholder="Notas sobre o pagamento..."
                        value={newPayment.notes}
                        onChange={(value) => setNewPayment({...newPayment, notes: value})}
                      />
                    </div>
                  </div>
                  <div className="payment-form-actions">
                    <Button 
                      variant="primary" 
                      onClick={handleAddPayment}
                    >
                      Confirmar Pagamento
                    </Button>
                  </div>
                </Card>
              )}

              <div className="payments-history">
                {contractPayments.length === 0 ? (
                  <p>Nenhum pagamento registrado para este contrato.</p>
                ) : (
                  <table className="payments-table">
                    <thead>
                      <tr>
                        <th>Parcela</th>
                        <th>Valor</th>
                        <th>Data</th>
                        <th>Método</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractPayments.map(p => (
                        <tr key={p.id}>
                          <td>{p.installment_number}ª Parcela</td>
                          <td>{formatCurrency(p.amount)}</td>
                          <td>{formatDate(p.payment_date)}</td>
                          <td>{p.payment_method?.toUpperCase()}</td>
                          <td><Badge variant="green">Pago</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaClientes;
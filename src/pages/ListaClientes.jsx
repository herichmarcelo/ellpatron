import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Edit, Eye, Phone, MapPin, Calendar, FileText, Plus, CreditCard, DollarSign } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { useClients, useUpdateClient, useAddToBlacklist, useRemoveFromBlacklist, isClientBlacklisted } from '../hooks/useClients';
import { formatPhone, formatDate, getInitials, stringToColor, formatAddress, formatCurrency } from '../utils/formatters';
import { getContracts, getPayments, createPayment } from '../supabase/services.js';
import './ListaClientes.css';

const ListaClientes = ({ onPageChange }) => {
  const navigate = useNavigate();
  const { mutate: updateClient } = useUpdateClient();
  const { mutate: addToBlacklist } = useAddToBlacklist();
  const { mutate: removeFromBlacklist } = useRemoveFromBlacklist();
  
  useEffect(() => {
    if (onPageChange) onPageChange('lista-clientes');
  }, [onPageChange]);
  
  const { clients, blacklist, loading, error, getClientStats, searchClients, getClientById } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientContracts, setClientContracts] = useState([]);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractPayments, setContractPayments] = useState([]);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
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
    const client = getClientById(clientId);
    if (client) {
      navigate(`/editar-cliente/${clientId}`);
    }
  };

  const handleViewClient = (clientId) => {
    const client = getClientById(clientId);
    if (client) {
      navigate(`/detalhes-cliente/${clientId}`);
    }
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
        // Filter contracts by client name (you may want to use client_id instead)
        const clientContracts = result.data.filter(
          contract => contract.client_name === client.name || contract.client_cpf === client.cpf
        );
        setClientContracts(clientContracts);
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
        installment_number: parseInt(newPayment.installment_number),
        amount: parseFloat(newPayment.amount),
        payment_date: newPayment.payment_date,
        payment_method: newPayment.payment_method,
        notes: newPayment.notes
      };

      const result = await createPayment(paymentData);
      
      if (result.success) {
        alert('Pagamento registrado com sucesso!');
        // Reload payments
        const paymentsResult = await getPayments({ contractProtocol: selectedContract.protocol_number });
        if (paymentsResult.success) {
          setContractPayments(paymentsResult.data || []);
        }
        // Reset form
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

  const getPaymentMethodLabel = (method) => {
    const labels = {
      pix: 'PIX',
      cash: 'Dinheiro',
      bank_transfer: 'Transferência Bancária',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      check: 'Cheque'
    };
    return labels[method] || method;
  };

  return (
    <div className="lista-clientes">
      <div className="lista-clientes-header">
        <div className="lista-clientes-title">
          <h2>Lista de Clientes</h2>
          <Badge variant="gold">{stats.total} cliente(s)</Badge>
        </div>
        
        <Button
          variant="primary"
          icon={UserPlus}
          onClick={handleAddClient}
        >
          Adicionar Cliente
        </Button>
      </div>

      <div className="lista-clientes-controls">
        <div className="lista-clientes-search">
          <Input
            placeholder="Buscar cliente..."
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
          <div className={`lista-clientes-grid lista-clientes-grid--${viewMode}`}>
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
                    <Phone size={16} className="lista-clientes-detail-icon" />
                    <span className="lista-clientes-detail-text">
                      {formatPhone(client.phone)}
                    </span>
                  </div>
                  
                  <div className="lista-clientes-detail">
                    <Calendar size={16} className="lista-clientes-detail-icon" />
                    <span className="lista-clientes-detail-text">
                      {formatDate(client.registrationDate)}
                    </span>
                  </div>

                  {client.address && (
                    <div className="lista-clientes-detail">
                      <MapPin size={16} className="lista-clientes-detail-icon" />
                      <span className="lista-clientes-detail-text">
                        {formatAddress(client.address)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="lista-clientes-actions">
                    {isClientBlacklisted(client.id, blacklist) ? (
                      <Button
                        variant="danger"
                        size="small"
                        icon={UserPlus}
                        onClick={() => handleRemoveFromBlacklist(client.id)}
                      >
                        Remover da Lista Negra
                      </Button>
                    ) : (
                      <Button
                        variant="warning"
                        size="small"
                        icon={UserPlus}
                        onClick={() => handleAddToBlacklist(client.id)}
                      >
                        Adicionar à Lista Negra
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
                     Histórico de Contratos
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
                     onClick={() => handleViewClient(client.id)}
                   >
                     Ver
                   </Button>
                 </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                        <p>Data: {new Date(contract.created_at).toLocaleDateString('pt-BR')}</p>
                        <p>Valor: {formatCurrency(contract.principal)}</p>
                        <p>Parcelas: {contract.installments}x</p>
                        <p>Valor da parcela: {formatCurrency(contract.monthly_installment)}</p>
                        <Badge variant={contract.status === 'open' ? 'green' : 'gray'}>
                          {contract.status === 'open' ? 'Ativo' : 'Fechado'}
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
              <h2>Histórico de Pagamentos - Contrato #{selectedContract.protocol_number}</h2>
              <Button variant="ghost" size="small" onClick={() => setShowPaymentsModal(false)}>
                ✕
              </Button>
            </div>
            <div className="modal-body">
              <div className="contract-summary">
                <Card className="contract-summary-card">
                  <h4>Resumo do Contrato</h4>
                  <p>Valor Principal: {formatCurrency(selectedContract.principal)}</p>
                  <p>Parcelas: {selectedContract.installments}x</p>
                  <p>Valor da Parcela: {formatCurrency(selectedContract.monthly_installment)}</p>
                  <p>Total a Pagar: {formatCurrency(selectedContract.total_original)}</p>
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
                      <label>Número da Parcela</label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={newPayment.installment_number}
                        onChange={(value) => setNewPayment({...newPayment, installment_number: value})}
                        min="1"
                        max={selectedContract.installments}
                      />
                    </div>
                    <div>
                      <label>Valor</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newPayment.amount}
                        onChange={(value) => setNewPayment({...newPayment, amount: value})}
                      />
                    </div>
                    <div>
                      <label>Data do Pagamento</label>
                      <Input
                        type="date"
                        value={newPayment.payment_date}
                        onChange={(value) => setNewPayment({...newPayment, payment_date: value})}
                      />
                    </div>
                    <div>
                      <label>Método de Pagamento</label>
                      <select
                        value={newPayment.payment_method}
                        onChange={(e) => setNewPayment({...newPayment, payment_method: e.target.value})}
                        className="payment-method-select"
                      >
                        <option value="pix">PIX</option>
                        <option value="cash">Dinheiro</option>
                        <option value="bank_transfer">Transferência Bancária</option>
                        <option value="credit_card">Cartão de Crédito</option>
                        <option value="debit_card">Cartão de Débito</option>
                        <option value="check">Cheque</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label>Observações</label>
                      <Input
                        placeholder="Observações sobre o pagamento..."
                        value={newPayment.notes}
                        onChange={(value) => setNewPayment({...newPayment, notes: value})}
                        multiline
                        rows={2}
                      />
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={handleAddPayment}
                    icon={CreditCard}
                  >
                    Registrar Pagamento
                  </Button>
                </Card>
              )}

              {contractPayments.length === 0 ? (
                <p>Nenhum pagamento registrado para este contrato.</p>
              ) : (
                <div className="payments-list">
                  {contractPayments.map(payment => (
                    <Card key={payment.id} className="payment-item">
                      <div className="payment-info">
                        <div className="payment-header">
                          <h4>Parcela {payment.installment_number}</h4>
                          <Badge variant="green">Pago</Badge>
                        </div>
                        <p>Valor: {formatCurrency(payment.amount)}</p>
                        <p>Data: {new Date(payment.payment_date).toLocaleDateString('pt-BR')}</p>
                        <p>Método: {getPaymentMethodLabel(payment.payment_method)}</p>
                        {payment.notes && <p>Obs: {payment.notes}</p>}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ListaClientes;
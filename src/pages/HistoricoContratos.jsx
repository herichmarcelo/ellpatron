import React, { useState, useEffect } from 'react';
import { FileText, Search, Eye, Edit, Download, Printer, Trash2, Filter } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getContracts, updateContract, deleteContract } from '../supabase/services';
import './HistoricoContratos.css';

const HistoricoContratos = ({ onPageChange }) => {
  useEffect(() => {
    if (onPageChange) onPageChange('historico-contratos');
  }, [onPageChange]);

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const result = await getContracts();
      console.log('Contracts result:', result);
      if (result.success) {
        setContracts(result.data || []);
        console.log('Contracts loaded:', result.data?.length || 0);
      } else {
        console.error('Error loading contracts:', result.error);
        // Se a tabela não existir, retorna array vazio
        setContracts([]);
        alert('Erro ao carregar contratos: ' + result.error + '\nA tabela "contracts" pode não existir no Supabase.');
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      // Se a tabela não existir, retorna array vazio
      setContracts([]);
      alert('Erro ao carregar contratos: ' + error.message + '\nA tabela "contracts" pode não existir no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.client_cpf?.includes(searchQuery) ||
      contract.protocol_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge variant="gold">Em aberto</Badge>;
      case 'paid':
        return <Badge variant="green">Pago</Badge>;
      case 'overdue':
        return <Badge variant="red">Em atraso</Badge>;
      case 'cancelled':
        return <Badge variant="dark">Cancelado</Badge>;
      default:
        return <Badge variant="ghost">{status}</Badge>;
    }
  };

  const handleView = (contract) => {
    setSelectedContract(contract);
    setShowViewModal(true);
  };

  const handleEdit = async (contract) => {
    const newStatus = prompt(
      'Selecione o novo status:\n1. Em aberto\n2. Pago\n3. Em atraso\n4. Cancelado',
      contract.status
    );

    if (newStatus) {
      const statusMap = {
        '1': 'open',
        '2': 'paid',
        '3': 'overdue',
        '4': 'cancelled',
        'Em aberto': 'open',
        'Pago': 'paid',
        'Em atraso': 'overdue',
        'Cancelado': 'cancelled'
      };

      const mappedStatus = statusMap[newStatus] || newStatus;
      
      if (['open', 'paid', 'overdue', 'cancelled'].includes(mappedStatus)) {
        const result = await updateContract(contract.id, { status: mappedStatus });
        if (result.success) {
          loadContracts();
          alert('Status atualizado com sucesso!');
        } else {
          alert('Erro ao atualizar status: ' + result.error);
        }
      } else {
        alert('Status inválido');
      }
    }
  };

  const handleDelete = async (contract) => {
    if (confirm(`Tem certeza que deseja excluir o contrato ${contract.protocol_number}?`)) {
      const result = await deleteContract(contract.id);
      if (result.success) {
        loadContracts();
        alert('Contrato excluído com sucesso!');
      } else {
        alert('Erro ao excluir contrato: ' + result.error);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!selectedContract) return;
    
    const contractText = `
CONTRATO DE EMPRÉSTIMO

Nº do Contrato: ${selectedContract.protocol_number}
Data: ${new Date(selectedContract.created_at).toLocaleDateString('pt-BR')}

PARTES:

CONTRATANTE: Ell Patron
CONTRATADO: ${selectedContract.client_name}
CPF: ${selectedContract.client_cpf}

CLÁUSULAS:

1. DO OBJETO
O presente contrato tem por objeto o empréstimo de ${formatCurrency(selectedContract.principal)}.

2. DAS CONDIÇÕES DO EMPRÉSTIMO
- Valor Principal: ${formatCurrency(selectedContract.principal)}
- Taxa de Juros: ${selectedContract.interest_rate}% ao mês
- Valor dos Juros: ${formatCurrency(selectedContract.interest_amount)}
- Total a Pagar: ${formatCurrency(selectedContract.total_original)}
- Data de Vencimento: ${new Date(selectedContract.due_date).toLocaleDateString('pt-BR')}

3. DAS PENALIDADES POR ATRASO
- Multa por Atraso: ${selectedContract.penalty_rate}% (aplicada uma única vez)
- Juros por Dia de Atraso: ${selectedContract.daily_interest_rate}% ao dia

4. DAS OBRIGAÇÕES
O contratado compromete-se a pagar o valor total até a data de vencimento estipulada.

5. DO FORO
As partes elegem o foro da comarca de sua residência para dirimir quaisquer dúvidas.

____________________________________
Assinatura do Responsável

____________________________________
Assinatura do Cliente/Colaborador

Data: ____/____/________
    `.trim();

    const blob = new Blob([contractText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-${selectedContract.protocol_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="historico-contratos">
        <div className="loading-screen">Carregando contratos...</div>
      </div>
    );
  }

  return (
    <div className="historico-contratos">
      <div className="historico-contratos-header">
        <div className="historico-contratos-title">
          <FileText size={24} />
          <h2>Histórico de Contratos</h2>
          <Badge variant="gold">{contracts.length} contrato(s)</Badge>
        </div>
      </div>

      <div className="historico-contratos-controls">
        <div className="historico-contratos-search">
          <Input
            placeholder="Buscar contrato..."
            icon={Search}
            value={searchQuery}
            onChange={setSearchQuery}
            fullWidth
          />
        </div>
        
        <div className="historico-contratos-filters">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="historico-contratos-filter-select"
          >
            <option value="all">Todos os status</option>
            <option value="open">Em aberto</option>
            <option value="paid">Pago</option>
            <option value="overdue">Em atraso</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="historico-contratos-content">
        {filteredContracts.length === 0 ? (
          <Card className="historico-contratos-empty">
            <p>Nenhum contrato encontrado.</p>
          </Card>
        ) : (
          <Card className="historico-contratos-table-container">
            <table className="historico-contratos-table">
              <thead>
                <tr>
                  <th>Nº Contrato</th>
                  <th>Cliente</th>
                  <th>CPF</th>
                  <th>Valor Emprestado</th>
                  <th>Juros</th>
                  <th>Total</th>
                  <th>Data Empréstimo</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="contract-protocol">{contract.protocol_number}</td>
                    <td className="contract-client">{contract.client_name}</td>
                    <td className="contract-cpf">{contract.client_cpf}</td>
                    <td className="contract-value">{formatCurrency(contract.principal)}</td>
                    <td className="contract-interest">{contract.interest_rate}%</td>
                    <td className="contract-total">{formatCurrency(contract.total_original)}</td>
                    <td className="contract-date">{formatDate(contract.loan_date)}</td>
                    <td className="contract-date">{formatDate(contract.due_date)}</td>
                    <td className="contract-status">{getStatusBadge(contract.status)}</td>
                    <td className="contract-actions">
                      <div className="contract-actions-buttons">
                        <Button
                          variant="ghost"
                          size="small"
                          icon={Eye}
                          onClick={() => handleView(contract)}
                          title="Visualizar"
                        />
                        <Button
                          variant="ghost"
                          size="small"
                          icon={Edit}
                          onClick={() => handleEdit(contract)}
                          title="Editar status"
                        />
                        <Button
                          variant="ghost"
                          size="small"
                          icon={Trash2}
                          onClick={() => handleDelete(contract)}
                          title="Excluir"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedContract && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <Card className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Contrato {selectedContract.protocol_number}</h3>
              <Button variant="ghost" icon={Trash2} onClick={() => setShowViewModal(false)}>
                Fechar
              </Button>
            </div>
            
            <div className="modal-body">
              <div className="contract-details">
                <div className="detail-row">
                  <span className="detail-label">Cliente:</span>
                  <span className="detail-value">{selectedContract.client_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">CPF:</span>
                  <span className="detail-value">{selectedContract.client_cpf}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Valor Principal:</span>
                  <span className="detail-value">{formatCurrency(selectedContract.principal)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Taxa de Juros:</span>
                  <span className="detail-value">{selectedContract.interest_rate}% ao mês</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Valor dos Juros:</span>
                  <span className="detail-value">{formatCurrency(selectedContract.interest_amount)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total a Pagar:</span>
                  <span className="detail-value">{formatCurrency(selectedContract.total_original)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Data de Vencimento:</span>
                  <span className="detail-value">{formatDate(selectedContract.due_date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Multa por Atraso:</span>
                  <span className="detail-value">{selectedContract.penalty_rate}%</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Juros por Dia de Atraso:</span>
                  <span className="detail-value">{selectedContract.daily_interest_rate}%</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{getStatusBadge(selectedContract.status)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" icon={Printer} onClick={handlePrint}>
                Imprimir
              </Button>
              <Button variant="secondary" icon={Download} onClick={handleDownload}>
                Baixar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HistoricoContratos;

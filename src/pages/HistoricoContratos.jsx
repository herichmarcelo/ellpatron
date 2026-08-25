import React, { useState, useEffect } from 'react';
import { FileText, Search, Eye, Edit, Download, Printer, Trash2, X, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { formatCurrency, formatDate, formatCPF } from '../utils/formatters';
import { getContracts, updateContract, deleteContract } from '../supabase/services';
import { exportContractsPDF, exportContractsExcel, exportSingleContractPDF } from '../utils/exportUtils';
import './HistoricoContratos.css';

const HistoricoContratos = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

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

  const filteredContracts = contracts.filter(contract => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (contract.client_name && contract.client_name.toLowerCase().includes(query)) ||
      (contract.client_cpf && contract.client_cpf.includes(query)) ||
      (contract.protocol_number && contract.protocol_number.toLowerCase().includes(query));
    
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
      'Selecione o novo status:\n1. Em aberto (open)\n2. Pago (paid)\n3. Em atraso (overdue)\n4. Cancelado (cancelled)',
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
        'Cancelado': 'cancelled',
        'open': 'open',
        'paid': 'paid',
        'overdue': 'overdue',
        'cancelled': 'cancelled'
      };

      const mappedStatus = statusMap[newStatus];
      
      if (mappedStatus) {
        const result = await updateContract(contract.id, { status: mappedStatus });
        if (result.success) {
          refreshContracts();
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
        refreshContracts();
        alert('Contrato excluído com sucesso!');
      } else {
        alert('Erro ao excluir contrato: ' + result.error);
      }
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
        </div>

        <div className="historico-contratos-actions">
          <Button
            variant="secondary"
            size="small"
            icon={Download}
            onClick={handleExportPDF}
          >
            Exportar PDF
          </Button>
          <Button
            variant="secondary"
            size="small"
            icon={Download}
            onClick={handleExportExcel}
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* KPI CARDS ANALÍTICOS */}
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

      <div className="historico-contratos-controls">
        <div className="historico-contratos-search">
          <Input
            placeholder="Buscar por cliente, CPF ou protocolo..."
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
                  <th>Valor Principal</th>
                  <th>Parcelas</th>
                  <th>Total</th>
                  <th>Empréstimo</th>
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
                    <td className="contract-cpf">{formatCPF(contract.client_cpf)}</td>
                    <td className="contract-value">{formatCurrency(contract.principal)}</td>
                    <td className="contract-interest">{contract.installments_count || 1}x {formatCurrency(contract.monthly_installment || contract.principal)}</td>
                    <td className="contract-total">{formatCurrency(contract.total_amount || contract.total_original || contract.principal)}</td>
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
                          title="Visualizar Detalhes"
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
              <Button variant="ghost" icon={X} onClick={() => setShowViewModal(false)}>
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
                  <span className="detail-value">{formatCPF(selectedContract.client_cpf)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Valor Principal:</span>
                  <span className="detail-value">{formatCurrency(selectedContract.principal)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Parcelas:</span>
                  <span className="detail-value">{selectedContract.installments_count || 1}x de {formatCurrency(selectedContract.monthly_installment || selectedContract.principal)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Taxa Mensal:</span>
                  <span className="detail-value">{selectedContract.interest_rate_month || selectedContract.interest_rate || 1.25}% a.m.</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total do Contrato:</span>
                  <span className="detail-value">{formatCurrency(selectedContract.total_amount || selectedContract.total_original || selectedContract.principal)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Data de Concessão:</span>
                  <span className="detail-value">{formatDate(selectedContract.loan_date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Data de Vencimento:</span>
                  <span className="detail-value">{formatDate(selectedContract.due_date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Multa por Atraso:</span>
                  <span className="detail-value">{selectedContract.late_fee_percentage || 10}%</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Juros Diários:</span>
                  <span className="detail-value">{selectedContract.daily_late_interest_percentage || 1}% ao dia</span>
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
              <Button variant="primary" icon={Download} onClick={handleDownloadSinglePDF}>
                Baixar PDF Oficial
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HistoricoContratos;

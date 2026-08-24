import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calculator, Save, X, Printer, Download } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import DatePicker from '../components/DatePicker';
import Badge from '../components/Badge';
import { formatCurrency, formatCPF, formatPhone } from '../utils/formatters';
import { 
  calculateContractValues, 
  calculateOverduePenalties, 
  calculateUpdatedTotal,
  generateContractProtocol 
} from '../utils/calculations';
import { useClients, useAddClient } from '../hooks/useClients';
import { useAddLoan } from '../hooks/useFinancial';
import './GerarContrato.css';

const GerarContrato = ({ onPageChange }) => {
  const navigate = useNavigate();
  const { clients: clientsList, loading: clientsLoading } = useClients();
  const { mutate: addClient } = useAddClient();
  const { mutate: addLoan } = useAddLoan();
  
  useEffect(() => {
    if (onPageChange) onPageChange('gerar-contrato');
  }, [onPageChange]);

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    dataEmprestimo: new Date(),
    valorPrincipal: '',
    dataVencimento: '',
    numeroParcelas: '1',
    jurosAno: '15',
    jurosMes: '1.25',
    multaAtraso: '10',
    jurosDiarioAtraso: '1'
  });

  const [simulationDays, setSimulationDays] = useState(0);
  const [showContract, setShowContract] = useState(false);
  const [generatedContract, setGeneratedContract] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Show client suggestions when typing name
    if (field === 'nome') {
      setShowClientSuggestions(value.length > 0);
    }
  };

  const handleClientSelect = (client) => {
    setFormData(prev => ({
      ...prev,
      nome: client.name,
      cpf: client.cpf || ''
    }));
    setShowClientSuggestions(false);
  };
  
  // Get client suggestions based on name input
  const clientSuggestions = formData.nome 
    ? clientsList.filter(c => 
        c.name.toLowerCase().includes(formData.nome.toLowerCase()) ||
        c.cpf.includes(formData.nome)
      )
    : [];

  const handleCPFChange = (value) => {
    const formatted = formatCPF(value);
    handleInputChange('cpf', formatted);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    }

    if (!formData.valorPrincipal) {
      newErrors.valorPrincipal = 'Valor principal é obrigatório';
    }

    if (!formData.dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento é obrigatória';
    }

    if (!formData.numeroParcelas) {
      newErrors.numeroParcelas = 'Número de parcelas é obrigatório';
    } else {
      const parcelas = parseInt(formData.numeroParcelas);
      if (parcelas < 1 || parcelas > 12) {
        newErrors.numeroParcelas = 'Número de parcelas deve ser entre 1 e 12';
      }
    }

    if (!formData.jurosAno || parseFloat(formData.jurosAno) < 0) {
      newErrors.jurosAno = 'Taxa de juros anual inválida';
    }

    if (!formData.jurosMes || parseFloat(formData.jurosMes) < 0) {
      newErrors.jurosMes = 'Taxa de juros mensal inválida';
    }

    if (!formData.multaAtraso || parseFloat(formData.multaAtraso) < 0) {
      newErrors.multaAtraso = 'Multa inválida';
    }

    if (!formData.jurosDiarioAtraso || parseFloat(formData.jurosDiarioAtraso) < 0) {
      newErrors.jurosDiarioAtraso = 'Juros diário inválido';
    }

    if (!formData.dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate contract values
  const principal = parseFloat(formData.valorPrincipal) || 0;
  const interestRateYear = parseFloat(formData.jurosAno) || 0;
  const interestRateMonth = parseFloat(formData.jurosMes) || 0;
  const penaltyRate = parseFloat(formData.multaAtraso) || 0;
  const dailyInterestRate = parseFloat(formData.jurosDiarioAtraso) || 0;
  const installments = parseInt(formData.numeroParcelas) || 1;

  // Calculate monthly installment
  const calculateMonthlyInstallment = () => {
    if (principal === 0 || installments === 0) return 0;
    
    // Using simple interest calculation
    const totalInterest = principal * (interestRateMonth / 100) * installments;
    const totalAmount = principal + totalInterest;
    return totalAmount / installments;
  };

  const monthlyInstallment = calculateMonthlyInstallment();
  const totalInterest = principal * (interestRateMonth / 100) * installments;
  const totalOriginal = principal + totalInterest;

  const contractValues = {
    interestAmount: totalInterest,
    totalOriginal: totalOriginal,
    monthlyInstallment: monthlyInstallment
  };
  const overduePenalties = calculateOverduePenalties(
    monthlyInstallment, 
    penaltyRate, 
    dailyInterestRate, 
    simulationDays
  );
  const updatedTotal = calculateUpdatedTotal(
    monthlyInstallment, 
    overduePenalties.totalPenalties
  );

  const handleGenerateContract = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // First, check if client exists or create new one
      let clientId = null;
      const existingClient = clientsList.find(c => c.cpf === formData.cpf);
      
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create new client
        await new Promise((resolve, reject) => {
          addClient({
            name: formData.nome,
            cpf: formData.cpf,
            phone: formData.telefone || '',
            email: formData.email || ''
          }, {
            onSuccess: (result) => {
              clientId = result.id;
              resolve();
            },
            onError: reject
          });
        });
      }

      if (!clientId) {
        throw new Error('Failed to create/find client');
      }

      // Create loan
      const protocol = generateContractProtocol();
      
      const loanData = {
        clientId: clientId,
        protocolNumber: protocol,
        principal: principal,
        interestRate: interestRateMonth / 100, // monthly rate
        installmentsCount: installments,
        dueDate: formData.dataVencimento,
        penaltyRate: penaltyRate / 100,
        dailyInterestRate: dailyInterestRate / 100,
        loanDate: formData.dataEmprestimo,
        status: 'active'
      };

      await new Promise((resolve, reject) => {
        addLoan(loanData, {
          onSuccess: (result) => {
            setGeneratedContract({
              ...loanData,
              protocolNumber: protocol,
              clientName: formData.nome,
              clientCpf: formData.cpf,
              id: result.id,
              createdAt: new Date().toISOString(),
              interestAmount: totalInterest,
              monthlyInstallment: monthlyInstallment,
              totalOriginal: totalOriginal
            });
            setShowContract(true);
            resolve();
          },
          onError: reject
        });
      });

      alert('Contrato salvo com sucesso!');
      
    } catch (error) {
      console.error('Error generating contract:', error);
      alert('Erro ao gerar contrato: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const contractText = generateContractText();
    const blob = new Blob([contractText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-${generatedContract?.protocol_number || 'draft'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateContractText = () => {
    const contract = generatedContract || formData;
    return `
CONTRATO DE EMPRÉSTIMO

Nº do Contrato: ${generatedContract?.protocol_number || 'Rascunho'}
Data: ${new Date().toLocaleDateString('pt-BR')}

PARTES:

CONTRATANTE: EasierControl
CONTRATADO: ${contract.nome}
CPF: ${contract.cpf}

CLÁUSULAS:

1. DO OBJETO
O presente contrato tem por objeto o empréstimo de ${formatCurrency(principal)}.

2. DAS CONDIÇÕES DO EMPRÉSTIMO
- Valor Principal: ${formatCurrency(principal)}
- Taxa de Juros: ${interestRate}% ao mês
- Valor dos Juros: ${formatCurrency(contractValues.interestAmount)}
- Total a Pagar: ${formatCurrency(contractValues.totalOriginal)}
- Data de Vencimento: ${new Date(formData.dataVencimento).toLocaleDateString('pt-BR')}

3. DAS PENALIDADES POR ATRASO
- Multa por Atraso: ${penaltyRate}% (aplicada uma única vez)
- Juros por Dia de Atraso: ${dailyInterestRate}% ao dia

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
  };

  if (showContract && generatedContract) {
    return (
      <div className="gerar-contrato">
        <div className="gerar-contrato-header">
          <h2>Contrato Gerado</h2>
          <div className="gerar-contrato-actions">
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>
              Imprimir
            </Button>
            <Button variant="secondary" icon={Download} onClick={handleDownload}>
              Baixar
            </Button>
            <Button variant="ghost" icon={X} onClick={() => setShowContract(false)}>
              Fechar
            </Button>
          </div>
        </div>

        <Card className="contract-document">
          <div className="contract-content">
            <h1 className="contract-title">CONTRATO DE EMPRÉSTIMO</h1>
            
            <div className="contract-info">
              <p><strong>Nº do Contrato:</strong> {generatedContract.protocol_number}</p>
              <p><strong>Data:</strong> {new Date(generatedContract.created_at).toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="contract-section">
              <h3>PARTES:</h3>
              <p><strong>CONTRATANTE:</strong> EasierControl</p>
              <p><strong>CONTRATADO:</strong> {generatedContract.client_name}</p>
              <p><strong>CPF:</strong> {generatedContract.client_cpf}</p>
            </div>

            <div className="contract-section">
              <h3>CLÁUSULAS:</h3>
              
              <div className="contract-clause">
                <h4>1. DO OBJETO</h4>
                <p>O presente contrato tem por objeto o empréstimo de {formatCurrency(generatedContract.principal)}.</p>
              </div>

              <div className="contract-clause">
                <h4>2. DAS CONDIÇÕES DO EMPRÉSTIMO</h4>
                <ul>
                  <li>Valor Principal: {formatCurrency(generatedContract.principal)}</li>
                  <li>Número de Parcelas: {generatedContract.installments}x</li>
                  <li>Juros ao Ano: {generatedContract.interest_rate_year}%</li>
                  <li>Juros ao Mês: {generatedContract.interest_rate_month}%</li>
                  <li>Valor da Parcela Mensal: {formatCurrency(generatedContract.monthly_installment)}</li>
                  <li>Valor dos Juros: {formatCurrency(generatedContract.interest_amount)}</li>
                  <li>Total a Pagar: {formatCurrency(generatedContract.total_original)}</li>
                  <li>Data de Vencimento: {new Date(generatedContract.due_date).toLocaleDateString('pt-BR')}</li>
                </ul>
              </div>

              <div className="contract-clause">
                <h4>3. DAS PENALIDADES POR ATRASO</h4>
                <ul>
                  <li>Multa por Atraso: {generatedContract.penalty_rate}% (aplicada uma única vez)</li>
                  <li>Juros por Dia de Atraso: {generatedContract.daily_interest_rate}% ao dia</li>
                </ul>
              </div>

              <div className="contract-clause">
                <h4>4. DAS OBRIGAÇÕES</h4>
                <p>O contratado compromete-se a pagar o valor total até a data de vencimento estipulada.</p>
              </div>

              <div className="contract-clause">
                <h4>5. DO FORO</h4>
                <p>As partes elegem o foro da comarca de sua residência para dirimir quaisquer dúvidas.</p>
              </div>
            </div>

            <div className="contract-signatures">
              <div className="signature-line">
                <p>____________________________________</p>
                <p>Assinatura do Responsável</p>
              </div>
              <div className="signature-line">
                <p>____________________________________</p>
                <p>Assinatura do Cliente/Colaborador</p>
              </div>
              <div className="signature-date">
                <p>Data: ____/____/________</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="gerar-contrato-footer">
          <Button 
            variant="primary" 
            onClick={() => {
              setShowContract(false);
              // Reset form
              setFormData({
                nome: '',
                cpf: '',
                dataEmprestimo: new Date(),
                valorPrincipal: '',
                dataVencimento: '',
                numeroParcelas: '1',
                jurosAno: '15',
                jurosMes: '1.25',
                multaAtraso: '10',
                jurosDiarioAtraso: '1'
              });
              setSimulationDays(0);
            }}
          >
            Novo Contrato
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gerar-contrato">
      <div className="gerar-contrato-header">
        <div className="gerar-contrato-title">
          <FileText size={24} />
          <h2>Gerar Contrato</h2>
        </div>
      </div>

      <div className="gerar-contrato-content">
        {/* Form Section */}
        <Card className="gerar-contrato-section">
          <div className="gerar-contrato-section-header">
            <h3>Dados do Contrato</h3>
          </div>
          
          <div className="gerar-contrato-grid">
            <div style={{ position: 'relative' }}>
              <Input
                label="Nome do Cliente/Colaborador *"
                placeholder="Digite o nome completo"
                value={formData.nome}
                onChange={(value) => handleInputChange('nome', value)}
                error={errors.nome}
                fullWidth
                required
              />
              {showClientSuggestions && formData.nome.length > 0 && (
                <div className="client-suggestions">
                  {clients
                    .filter(client => 
                      client.name.toLowerCase().includes(formData.nome.toLowerCase())
                    )
                    .slice(0, 5)
                    .map(client => (
                      <div
                        key={client.id}
                        className="client-suggestion-item"
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="client-suggestion-name">{client.name}</div>
                        <div className="client-suggestion-cpf">{client.cpf || ''}</div>
                      </div>
                    ))}
                  {clients.filter(client => 
                    client.name.toLowerCase().includes(formData.nome.toLowerCase())
                  ).length === 0 && (
                    <div className="client-suggestion-empty">
                      Nenhum cliente encontrado
                    </div>
                  )}
                </div>
              )}
            </div>

            <Input
              label="CPF *"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={handleCPFChange}
              error={errors.cpf}
              fullWidth
              required
            />

            <DatePicker
              label="Data do Empréstimo *"
              value={formData.dataEmprestimo}
              onChange={(value) => handleInputChange('dataEmprestimo', value)}
              fullWidth
              required
            />

            <Input
              label="Valor Principal (R$) *"
              type="number"
              placeholder="1000.00"
              value={formData.valorPrincipal}
              onChange={(value) => handleInputChange('valorPrincipal', value)}
              error={errors.valorPrincipal}
              fullWidth
              required
            />

            <DatePicker
              label="Data de Vencimento *"
              value={formData.dataVencimento}
              onChange={(value) => handleInputChange('dataVencimento', value)}
              error={errors.dataVencimento}
              fullWidth
              required
            />

            <Input
              label="Número de Parcelas *"
              type="number"
              placeholder="1"
              min="1"
              max="12"
              value={formData.numeroParcelas}
              onChange={(value) => handleInputChange('numeroParcelas', value)}
              error={errors.numeroParcelas}
              fullWidth
              required
            />
          </div>
        </Card>

        {/* Interest Rates */}
        <Card className="gerar-contrato-section">
          <div className="gerar-contrato-section-header">
            <Calculator size={20} />
            <h3>Dados de Juros</h3>
          </div>
          
          <div className="gerar-contrato-grid">
            <Input
              label="Juros ao Ano (%) *"
              type="number"
              placeholder="15"
              step="0.01"
              value={formData.jurosAno}
              onChange={(value) => handleInputChange('jurosAno', value)}
              error={errors.jurosAno}
              fullWidth
              required
            />

            <Input
              label="Juros ao Mês (%) *"
              type="number"
              placeholder="1.25"
              step="0.01"
              value={formData.jurosMes}
              onChange={(value) => handleInputChange('jurosMes', value)}
              error={errors.jurosMes}
              fullWidth
              required
            />

            <Input
              label="Multa por Atraso (%) *"
              type="number"
              placeholder="10"
              step="0.01"
              value={formData.multaAtraso}
              onChange={(value) => handleInputChange('multaAtraso', value)}
              error={errors.multaAtraso}
              fullWidth
              required
            />

            <Input
              label="Juros Diário por Atraso (%) *"
              type="number"
              placeholder="1"
              step="0.01"
              value={formData.jurosDiarioAtraso}
              onChange={(value) => handleInputChange('jurosDiarioAtraso', value)}
              error={errors.jurosDiarioAtraso}
              fullWidth
              required
            />
          </div>
        </Card>

        {/* Calculation Summary */}
        {principal > 0 && (
          <Card className="gerar-contrato-section">
            <div className="gerar-contrato-section-header">
              <Calculator size={20} />
              <h3>Resumo do Cálculo</h3>
            </div>
            
            <div className="calculation-summary">
              <div className="calculation-row">
                <span className="calculation-label">Valor Principal:</span>
                <span className="calculation-value">{formatCurrency(principal)}</span>
              </div>
              <div className="calculation-row">
                <span className="calculation-label">Número de Parcelas:</span>
                <span className="calculation-value">{installments}x</span>
              </div>
              <div className="calculation-row">
                <span className="calculation-label">Juros ao Ano:</span>
                <span className="calculation-value">{interestRateYear}%</span>
              </div>
              <div className="calculation-row">
                <span className="calculation-label">Juros ao Mês:</span>
                <span className="calculation-value">{interestRateMonth}%</span>
              </div>
              <div className="calculation-row">
                <span className="calculation-label">Total de Juros:</span>
                <span className="calculation-value">{formatCurrency(totalInterest)}</span>
              </div>
              <div className="calculation-row calculation-row--highlight">
                <span className="calculation-label">Valor da Parcela Mensal:</span>
                <span className="calculation-value">{formatCurrency(monthlyInstallment)}</span>
              </div>
              <div className="calculation-row calculation-row--total">
                <span className="calculation-label">Total a Pagar:</span>
                <span className="calculation-value">{formatCurrency(totalOriginal)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="gerar-contrato-actions">
          <Button
            variant="primary"
            icon={Save}
            onClick={handleGenerateContract}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Gerando...' : 'Gerar Contrato'}
          </Button>
        </div>

        {/* Simulation Section */}
        <Card className="gerar-contrato-section">
          <div className="gerar-contrato-section-header">
            <Calculator size={20} />
            <h3>Simulação de Atraso</h3>
          </div>
          
          <div className="simulation-inputs">
            <Input
              label="Dias de atraso"
              type="number"
              placeholder="0"
              value={simulationDays}
              onChange={(value) => setSimulationDays(parseInt(value) || 0)}
              min="0"
              fullWidth
            />
          </div>

          {simulationDays > 0 && (
            <div className="simulation-results">
              <div className="calculation-row">
                <span className="calculation-label">Valor da Parcela Mensal:</span>
                <span className="calculation-value">{formatCurrency(monthlyInstallment)}</span>
              </div>
              <div className="calculation-row calculation-row--penalty">
                <span className="calculation-label">Multa por atraso:</span>
                <span className="calculation-value">{formatCurrency(overduePenalties.penaltyAmount)}</span>
              </div>
              <div className="calculation-row calculation-row--penalty">
                <span className="calculation-label">Juros de atraso ({simulationDays} dias):</span>
                <span className="calculation-value">{formatCurrency(overduePenalties.totalDailyInterest)}</span>
              </div>
              <div className="calculation-row calculation-row--highlight">
                <span className="calculation-label">Total de encargos:</span>
                <span className="calculation-value">{formatCurrency(overduePenalties.totalPenalties)}</span>
              </div>
              <div className="calculation-row calculation-row--total">
                <span className="calculation-label">Total a pagar (com atraso):</span>
                <span className="calculation-value">{formatCurrency(updatedTotal.totalUpdated)}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="gerar-contrato-actions">
          <Button
            variant="primary"
            icon={Save}
            onClick={handleGenerateContract}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Gerando...' : 'Gerar Contrato'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GerarContrato;

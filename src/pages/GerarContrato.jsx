import React, { useState } from 'react';
import { FileText, Calculator, Save, X, Printer, Download } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import DatePicker from '../components/DatePicker';
import { formatCurrency, formatCPF } from '../utils/formatters';
import { 
  calculateOverduePenalties, 
  calculateUpdatedTotal,
  generateContractProtocol 
} from '../utils/calculations';
import { useClients, useAddClient } from '../hooks/useClients';
import { useAddLoan } from '../hooks/useFinancial';
import { createContract } from '../supabase/services.js';
import { exportSingleContractPDF } from '../utils/exportUtils';
import './GerarContrato.css';

const GerarContrato = () => {
  const { clients: clientsList } = useClients();
  const { mutate: addClient } = useAddClient();
  const { mutate: addLoan } = useAddLoan();

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

  const handleInputChange = (field, e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
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

    if (field === 'nome') {
      setShowClientSuggestions(typeof value === 'string' && value.length > 0);
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

  const handleCPFChange = (e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculations
  const principal = parseFloat(formData.valorPrincipal) || 0;
  const interestRateYear = parseFloat(formData.jurosAno) || 0;
  const interestRateMonth = parseFloat(formData.jurosMes) || 0;
  const penaltyRate = parseFloat(formData.multaAtraso) || 0;
  const dailyInterestRate = parseFloat(formData.jurosDiarioAtraso) || 0;
  const installments = parseInt(formData.numeroParcelas) || 1;

  const totalInterest = principal * (interestRateMonth / 100) * installments;
  const totalOriginal = principal + totalInterest;
  const monthlyInstallment = installments > 0 ? totalOriginal / installments : 0;

  const overduePenalties = calculateOverduePenalties(
    monthlyInstallment, 
    penaltyRate, 
    dailyInterestRate, 
    simulationDays
  );
  const updatedTotal = calculateUpdatedTotal(
    monthlyInstallment, 
    overduePenalties.multaValor,
    overduePenalties.jurosDiariosValor
  );

  const handleGenerateContract = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let clientId = null;
      const existingClient = clientsList.find(c => c.cpf === formData.cpf);
      
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        await new Promise((resolve, reject) => {
          addClient({
            name: formData.nome,
            cpf: formData.cpf,
            phone: '',
            email: ''
          }, {
            onSuccess: (result) => {
              clientId = result.id;
              resolve();
            },
            onError: reject
          });
        });
      }

      const protocol = generateContractProtocol();
      
      // Save in contracts table
      const contractData = {
        protocol_number: protocol,
        client_id: clientId,
        client_name: formData.nome,
        client_cpf: formData.cpf,
        loan_date: formData.dataEmprestimo instanceof Date ? formData.dataEmprestimo.toISOString().split('T')[0] : formData.dataEmprestimo,
        due_date: formData.dataVencimento instanceof Date ? formData.dataVencimento.toISOString().split('T')[0] : formData.dataVencimento,
        principal: principal,
        installments_count: installments,
        interest_rate_year: interestRateYear,
        interest_rate_month: interestRateMonth,
        late_fee_percentage: penaltyRate,
        daily_late_interest_percentage: dailyInterestRate,
        monthly_installment: monthlyInstallment,
        total_amount: totalOriginal,
        status: 'open'
      };

      await createContract(contractData);

      // Also save in loans for backward compatibility
      const loanData = {
        clientId: clientId,
        protocolNumber: protocol,
        principal: principal,
        interestRate: interestRateMonth,
        installmentsCount: installments,
        dueDate: formData.dataVencimento,
        penaltyRate: penaltyRate,
        dailyInterestRate: dailyInterestRate,
        loanDate: formData.dataEmprestimo,
        status: 'active'
      };

      addLoan(loanData);

      setGeneratedContract({
        ...contractData,
        id: protocol,
        created_at: new Date().toISOString()
      });

      setShowContract(true);
      alert('Contrato gerado e salvo com sucesso!');
      
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

  const handleDownloadPDF = () => {
    if (!generatedContract) return;
    exportSingleContractPDF(generatedContract);
  };

  if (showContract && generatedContract) {
    return (
      <div className="gerar-contrato">
        <div className="gerar-contrato-header">
          <h2>Contrato Gerado com Sucesso</h2>
          <div className="gerar-contrato-actions">
            <Button variant="secondary" icon={Printer} onClick={handlePrint}>
              Imprimir
            </Button>
            <Button variant="primary" icon={Download} onClick={handleDownloadPDF}>
              Baixar PDF Oficial
            </Button>
            <Button variant="ghost" icon={X} onClick={() => setShowContract(false)}>
              Fechar
            </Button>
          </div>
        </div>

        <Card className="contract-document">
          <div className="contract-content">
            <h1 className="contract-title">INSTRUMENTO DE MÚTUO FINANCEIRO</h1>
            
            <div className="contract-info">
              <p><strong>Nº do Protocolo:</strong> {generatedContract.protocol_number}</p>
              <p><strong>Data de Emissão:</strong> {new Date(generatedContract.created_at).toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="contract-section">
              <h3>PARTES:</h3>
              <p><strong>CREDOR:</strong> Ell Patron Gestão Financeira</p>
              <p><strong>DEVEDOR(A):</strong> {generatedContract.client_name}</p>
              <p><strong>CPF:</strong> {formatCPF(generatedContract.client_cpf)}</p>
            </div>

            <div className="contract-section">
              <h3>CONDIÇÕES DO EMPRÉSTIMO:</h3>
              <div className="contract-clause">
                <ul>
                  <li><strong>Valor Principal:</strong> {formatCurrency(generatedContract.principal)}</li>
                  <li><strong>Número de Parcelas:</strong> {generatedContract.installments_count}x de {formatCurrency(generatedContract.monthly_installment)}</li>
                  <li><strong>Taxa Anual:</strong> {generatedContract.interest_rate_year}% a.a.</li>
                  <li><strong>Taxa Mensal:</strong> {generatedContract.interest_rate_month}% a.m.</li>
                  <li><strong>Total a Pagar:</strong> {formatCurrency(generatedContract.total_amount)}</li>
                  <li><strong>Data de Vencimento:</strong> {new Date(generatedContract.due_date).toLocaleDateString('pt-BR')}</li>
                  <li><strong>Multa por Atraso:</strong> {generatedContract.late_fee_percentage}%</li>
                  <li><strong>Juros Diários:</strong> {generatedContract.daily_late_interest_percentage}% ao dia</li>
                </ul>
              </div>

              <div className="contract-clause">
                <h4>CLÁUSULAS GERAIS:</h4>
                <p>1. O DEVEDOR declara ter recebido a quantia descrita e compromete-se com a sua restituição nos prazos estipulados.</p>
                <p>2. A impontualidade acarretará nos encargos contratuais de mora e inclusão na Lista Negra de inadimplentes.</p>
              </div>
            </div>

            <div className="contract-signatures">
              <div className="signature-line">
                <p>____________________________________</p>
                <p>ELL PATRON GESTÃO</p>
              </div>
              <div className="signature-line">
                <p>____________________________________</p>
                <p>{generatedContract.client_name}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="gerar-contrato-footer">
          <Button 
            variant="primary" 
            onClick={() => {
              setShowContract(false);
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
                  {clientsList
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
                  {clientsList.filter(client =>
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
            <h3>Taxas de Juros & Multas</h3>
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
              <h3>Resumo dos Valores Calculados</h3>
            </div>
            
            <div className="calculation-summary">
              <div className="calculation-row">
                <span className="calculation-label">Valor Principal:</span>
                <span className="calculation-value">{formatCurrency(principal)}</span>
              </div>
              <div className="calculation-row">
                <span className="calculation-label">Parcelamento:</span>
                <span className="calculation-value">{installments}x de {formatCurrency(monthlyInstallment)}</span>
              </div>
              <div className="calculation-row">
                <span className="calculation-label">Total de Juros:</span>
                <span className="calculation-value">{formatCurrency(totalInterest)}</span>
              </div>
              <div className="calculation-row calculation-row--total">
                <span className="calculation-label">Total Geral do Contrato:</span>
                <span className="calculation-value">{formatCurrency(totalOriginal)}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Simulation Section */}
        <Card className="gerar-contrato-section">
          <div className="gerar-contrato-section-header">
            <Calculator size={20} />
            <h3>Simulação de Atraso e Juros de Mora</h3>
          </div>
          
          <div className="simulation-inputs">
            <Input
              label="Simular Dias de Atraso"
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
                <span className="calculation-label">Valor da Parcela Base:</span>
                <span className="calculation-value">{formatCurrency(monthlyInstallment)}</span>
              </div>
              <div className="calculation-row calculation-row--penalty">
                <span className="calculation-label">Multa por atraso ({penaltyRate}%):</span>
                <span className="calculation-value">{formatCurrency(overduePenalties.multaValor)}</span>
              </div>
              <div className="calculation-row calculation-row--penalty">
                <span className="calculation-label">Juros diários ({dailyInterestRate}%/dia x {simulationDays} dias):</span>
                <span className="calculation-value">{formatCurrency(overduePenalties.jurosDiariosValor)}</span>
              </div>
              <div className="calculation-row calculation-row--total">
                <span className="calculation-label">Total a Pagar com Atraso:</span>
                <span className="calculation-value">{formatCurrency(updatedTotal.totalUpdated)}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="gerar-contrato-actions-bottom">
          <Button
            variant="primary"
            icon={Save}
            onClick={handleGenerateContract}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Gerando...' : 'Gerar e Salvar Contrato'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GerarContrato;

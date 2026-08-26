import React, { useState, useEffect } from 'react';
import { FileText, Calculator, Save, X, Printer, Download, Eye, RotateCcw, Share2, ShieldAlert } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import DatePicker from '../components/DatePicker';
import CreditScoreCard from '../components/CreditScoreCard';
import { formatCurrency, formatCPF, getBrasiliaISODate } from '../utils/formatters';
import { 
  calculateOverduePenalties, 
  calculateUpdatedTotal, 
  generateContractProtocol 
} from '../utils/calculations';
import { useClients, useAddClient, isClientBlacklisted } from '../hooks/useClients';
import { createContract, getContracts, getPayments } from '../supabase/services.js';
import { calculateCreditScore } from '../utils/scoreCalculator';
import { exportSingleContractPDF } from '../utils/exportUtils';
import './GerarContrato.css';

const GerarContrato = () => {
  const { clients: clientsList = [], blacklist = [] } = useClients();
  const { mutate: addClient } = useAddClient();

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

  // Novos estados para a experiência Mobile-First (Divulgação Progressiva)
  const [isSimulated, setIsSimulated] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [generatedContract, setGeneratedContract] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [allContracts, setAllContracts] = useState([]);
  const [allPayments, setAllPayments] = useState([]);

  // Carrega histórico para análise em tempo real do Score de Crédito
  useEffect(() => {
    let isMounted = true;
    const fetchScoreData = async () => {
      try {
        const [contractsRes, paymentsRes] = await Promise.all([
          getContracts(),
          getPayments()
        ]);
        if (isMounted) {
          if (contractsRes.success) setAllContracts(contractsRes.data || []);
          if (paymentsRes.success) setAllPayments(paymentsRes.data || []);
        }
      } catch (err) {
        console.error('Error loading contracts/payments in GerarContrato:', err);
      }
    };
    fetchScoreData();
    return () => { isMounted = false; };
  }, []);

  // Encontra cliente correspondente por CPF ou Nome
  const cpfCleanForm = (formData.cpf || '').replace(/\D/g, '');
  const matchedClient = clientsList.find(c => {
    const cpfCleanClient = (c.cpf || '').replace(/\D/g, '');
    if (cpfCleanForm.length === 11 && cpfCleanClient === cpfCleanForm) return true;
    if (formData.nome.trim() && c.name && formData.nome.toLowerCase().trim() === c.name.toLowerCase().trim()) return true;
    return false;
  });

  const isClientBlocked = matchedClient ? isClientBlacklisted(blacklist, matchedClient.id) : false;

  const clientScoreData = (matchedClient || formData.nome.trim().length > 2 || cpfCleanForm.length >= 11) ? calculateCreditScore(
    matchedClient || { name: formData.nome, cpf: formData.cpf },
    allContracts,
    allPayments,
    isClientBlocked
  ) : null;

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

    // Se o usuário alterar qualquer dado, reseta a simulação
    setIsSimulated(false);

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
    setIsSimulated(false);
  };

  const handleCPFChange = (e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
    const formatted = formatCPF(value);
    handleInputChange('cpf', formatted);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.cpf.trim()) newErrors.cpf = 'CPF é obrigatório';
    if (!formData.valorPrincipal) newErrors.valorPrincipal = 'Valor principal é obrigatório';
    if (!formData.dataVencimento) newErrors.dataVencimento = 'Data de vencimento é obrigatória';
    
    if (!formData.numeroParcelas) {
      newErrors.numeroParcelas = 'Obrigatório';
    } else {
      const parcelas = parseInt(formData.numeroParcelas);
      if (parcelas < 1 || parcelas > 12) newErrors.numeroParcelas = 'Deve ser entre 1 e 12';
    }
    
    if (!formData.jurosAno || parseFloat(formData.jurosAno) < 0) newErrors.jurosAno = 'Inválido';
    if (!formData.jurosMes || parseFloat(formData.jurosMes) < 0) newErrors.jurosMes = 'Inválido';
    if (!formData.multaAtraso || parseFloat(formData.multaAtraso) < 0) newErrors.multaAtraso = 'Inválido';
    if (!formData.jurosDiarioAtraso || parseFloat(formData.jurosDiarioAtraso) < 0) newErrors.jurosDiarioAtraso = 'Inválido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Cálculos Automáticos
  const principal = parseFloat(formData.valorPrincipal) || 0;
  const interestRateYear = parseFloat(formData.jurosAno) || 0;
  const interestRateMonth = parseFloat(formData.jurosMes) || 0;
  const penaltyRate = parseFloat(formData.multaAtraso) || 0;
  const dailyInterestRate = parseFloat(formData.jurosDiarioAtraso) || 0;
  const installments = parseInt(formData.numeroParcelas) || 1;

  const totalInterest = principal * (interestRateMonth / 100) * installments;
  const totalOriginal = principal + totalInterest;
  const monthlyInstallment = installments > 0 ? totalOriginal / installments : 0;

  const handleSimulate = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSimulated(true);
      // Rola a tela suavemente para baixo para ver o resultado da simulação
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } else {
      alert("Por favor, preencha todos os campos obrigatórios corretamente antes de simular.");
    }
  };

  const handleGenerateContract = async () => {
    if (!validateForm() || !isSimulated) return;
    setIsSubmitting(true);

    try {
      const existingClient = clientsList.find(c => c.cpf === formData.cpf);
      if (!existingClient) {
        try {
          addClient({
            name: formData.nome,
            cpf: formData.cpf,
            phone: '',
            email: '',
            address: {}
          });
        } catch (e) {
          console.warn('Aviso ao cadastrar cliente automático:', e);
        }
      }

      const protocol = generateContractProtocol();
      
      const contractData = {
        protocol_number: protocol,
        client_name: formData.nome,
        client_cpf: formData.cpf,
        loan_date: formData.dataEmprestimo instanceof Date ? getBrasiliaISODate(formData.dataEmprestimo) : (formData.dataEmprestimo || getBrasiliaISODate()),
        due_date: formData.dataVencimento instanceof Date ? getBrasiliaISODate(formData.dataVencimento) : (formData.dataVencimento || getBrasiliaISODate()),
        principal: principal,
        installments: installments,
        interest_rate_year: interestRateYear,
        interest_rate_month: interestRateMonth,
        penalty_rate: penaltyRate,
        daily_interest_rate: dailyInterestRate,
        interest_amount: totalInterest,
        monthly_installment: monthlyInstallment,
        total_original: totalOriginal,
        status: 'open'
      };

      const result = await createContract(contractData);
      if (!result.success) {
        throw new Error(result.error || 'Falha ao salvar contrato no banco de dados');
      }

      setGeneratedContract({
        ...contractData,
        id: result.id || protocol,
        created_at: new Date().toISOString()
      });

      setShowContract(true);
      setIsSimulated(false);
      alert('Contrato gerado e gravado com sucesso no sistema!');
      
    } catch (error) {
      console.error('Error generating contract:', error);
      alert('Erro ao gerar contrato: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => window.print();
  
  const handleDownloadPDF = () => {
    if (!generatedContract) return;
    exportSingleContractPDF(generatedContract);
  };

  const handleShareWhatsApp = () => {
    // 1. Monta o cabeçalho do resumo em texto
    let texto = `*SIMULAÇÃO DE EMPRÉSTIMO* 📊\n\n`;
    texto += `*Cliente:* ${formData.nome || 'Cliente'}\n`;
    texto += `*Valor Liberado:* ${formatCurrency(principal)}\n`;
    texto += `*Parcelamento:* ${installments}x de ${formatCurrency(monthlyInstallment)}\n`;
    texto += `*Total do Contrato:* ${formatCurrency(totalOriginal)}\n\n`;
    
    // 2. Monta a tabela de projeção de atrasos
    texto += `*PROJEÇÃO DE ATRASOS* ⚠️\n`;
    texto += `_(Multa: ${penaltyRate}% | Juros: ${dailyInterestRate}% ao dia)_\n\n`;
    
    const diasSimulacao = [1, 5, 10, 15, 20, 25, 30];
    
    diasSimulacao.forEach(days => {
      const penalties = calculateOverduePenalties(monthlyInstallment, penaltyRate, dailyInterestRate, days);
      const updated = calculateUpdatedTotal(monthlyInstallment, penalties.totalPenalties);
      
      texto += `• ${days} dia(s): *${formatCurrency(updated.totalUpdated)}*\n`;
    });

    texto += `\n_Simulação gerada em ${new Date().toLocaleDateString('pt-BR')}._`;

    // 3. Converte para o formato de link do WhatsApp
    const textoCodificado = encodeURIComponent(texto);
    
    // 4. Se encontrar o telefone do cliente, pré-preenche o número
    const clientFound = clientsList.find(c => c.cpf === formData.cpf || c.name === formData.nome);
    const numLimpo = (clientFound?.phone || '').replace(/\D/g, '');
    const url = numLimpo ? `https://wa.me/55${numLimpo}?text=${textoCodificado}` : `https://wa.me/?text=${textoCodificado}`;
    
    window.open(url, '_blank');
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
              setIsSimulated(false);
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
        {/* ETAPA 1: DADOS DO CLIENTE E EMPRÉSTIMO */}
        <Card className="gerar-contrato-section">
          <div className="gerar-contrato-section-header">
            <h3>1. Dados do Cliente e Empréstimo</h3>
          </div>
          
          <div className="gerar-contrato-grid">
            <div style={{ position: 'relative' }}>
              <Input
                label="Nome Completo *"
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
                        <div className="client-suggestion-cpf">{client.cpf ? formatCPF(client.cpf) : ''}</div>
                      </div>
                    ))}
                  {clientsList.filter(client =>
                    client.name.toLowerCase().includes(formData.nome.toLowerCase())
                  ).length === 0 && (
                    <div className="client-suggestion-empty">
                      Nenhum cliente cadastrado com este nome
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

            {/* Termômetro de Score de Crédito do Cliente */}
            {clientScoreData && (
              <div className="gerar-contrato-score-fullwidth">
                <CreditScoreCard scoreData={clientScoreData} variant="compact" />
              </div>
            )}

            {isClientBlocked && (
              <div className="gerar-contrato-blocked-alert">
                <ShieldAlert size={18} />
                <span><strong>BLOQUEIO PREVENTIVO:</strong> Este cliente consta na <strong>Lista Negra</strong> do sistema. Avalie os riscos antes de conceder novos limites.</span>
              </div>
            )}

            <Input
              label="Valor Principal (R$) *"
              type="number"
              placeholder="Ex: 1000.00"
              value={formData.valorPrincipal}
              onChange={(value) => handleInputChange('valorPrincipal', value)}
              error={errors.valorPrincipal}
              fullWidth
              required
            />

            <Input
              label="Qtd. Parcelas *"
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

            <DatePicker
              label="Data do Empréstimo *"
              value={formData.dataEmprestimo}
              onChange={(value) => handleInputChange('dataEmprestimo', value)}
              fullWidth
              required
            />

            <DatePicker
              label="Vencimento (1ª Parcela) *"
              value={formData.dataVencimento}
              onChange={(value) => handleInputChange('dataVencimento', value)}
              error={errors.dataVencimento}
              fullWidth
              required
            />
          </div>
        </Card>

        {/* ETAPA 2: TAXAS E MULTAS */}
        <Card className="gerar-contrato-section">
          <div className="gerar-contrato-section-header">
            <Calculator size={20} />
            <h3>2. Taxas e Multas</h3>
          </div>
          
          <div className="gerar-contrato-grid">
            <Input 
              label="Juros ao Ano (%) *" 
              type="number" 
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
              step="0.01" 
              value={formData.jurosMes} 
              onChange={(value) => handleInputChange('jurosMes', value)} 
              error={errors.jurosMes} 
              fullWidth 
              required 
            />
            <Input 
              label="Multa Atraso (%) *" 
              type="number" 
              step="0.01" 
              value={formData.multaAtraso} 
              onChange={(value) => handleInputChange('multaAtraso', value)} 
              error={errors.multaAtraso} 
              fullWidth 
              required 
            />
            <Input 
              label="Juros Diário Atraso (%) *" 
              type="number" 
              step="0.01" 
              value={formData.jurosDiarioAtraso} 
              onChange={(value) => handleInputChange('jurosDiarioAtraso', value)} 
              error={errors.jurosDiarioAtraso} 
              fullWidth 
              required 
            />
          </div>
        </Card>

        {/* BOTÃO DE SIMULAÇÃO (Destacado Mobile-First) */}
        {!isSimulated && (
          <div className="simulation-action-area">
            <Button 
              variant="primary" 
              icon={Eye} 
              onClick={handleSimulate} 
              className="btn-simulate"
            >
              Simular Parcelas e Valores
            </Button>
            <p className="simulation-hint">Simule para revisar os valores antes de gerar o contrato.</p>
          </div>
        )}

        {/* ETAPA 3: RESUMO APROVADO & GERAÇÃO (Apenas visível pós-simulação) */}
        {isSimulated && (
          <>
            <Card className="gerar-contrato-section highlight-simulation">
              <div className="gerar-contrato-section-header">
                <Calculator size={20} />
                <h3>3. Resumo Aprovado</h3>
              </div>
              
              <div className="calculation-summary">
                <div className="calculation-row">
                  <span className="calculation-label">Valor Emprestado (Capital):</span>
                  <span className="calculation-value">{formatCurrency(principal)}</span>
                </div>
                <div className="calculation-row">
                  <span className="calculation-label">Total de Juros Cobrados:</span>
                  <span className="calculation-value text-red">+{formatCurrency(totalInterest)}</span>
                </div>
                
                <div className="calculation-row calculation-row--total">
                  <span className="calculation-label">Valor Total do Contrato:</span>
                  <span className="calculation-value">{formatCurrency(totalOriginal)}</span>
                </div>

                <div className="calculation-installment-highlight">
                  <span className="installment-text">O cliente pagará em:</span>
                  <span className="installment-big">
                    {installments}x de {formatCurrency(monthlyInstallment)}
                  </span>
                </div>
              </div>

              {/* NOVA SEÇÃO: Projeção de Atrasos */}
              <div className="gerar-contrato-section-header" style={{ marginTop: '32px' }}>
                <Calculator size={20} />
                <h3>Projeção de Atraso (Por Parcela)</h3>
              </div>
              
              <div className="delay-simulation-grid">
                <div className="delay-simulation-header">
                  <span>Dias Corridos</span>
                  <span>Novo Valor da Parcela</span>
                </div>
                
                {/* Tabela gerada automaticamente para os dias informados */}
                {[1, 5, 10, 15, 20, 25, 30].map(days => {
                  const penalties = calculateOverduePenalties(monthlyInstallment, penaltyRate, dailyInterestRate, days);
                  const updated = calculateUpdatedTotal(monthlyInstallment, penalties.totalPenalties);
                  
                  return (
                    <div key={days} className="delay-simulation-row">
                      <span>{days} {days === 1 ? 'dia de atraso' : 'dias de atraso'}</span>
                      <span className="text-red font-bold">{formatCurrency(updated.totalUpdated)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="gerar-contrato-actions-bottom">
              <Button 
                variant="ghost" 
                icon={RotateCcw} 
                onClick={() => setIsSimulated(false)}
              >
                Editar Valores
              </Button>
              
              <Button 
                variant="outline" 
                icon={Share2} 
                onClick={handleShareWhatsApp}
                className="btn-share-wpp"
              >
                Enviar Resumo (WhatsApp)
              </Button>

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
          </>
        )}
      </div>
    </div>
  );
};

export default GerarContrato;

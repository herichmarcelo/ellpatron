import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Landmark, PiggyBank, ArrowUpRight, ArrowDownLeft, TrendingUp, 
  Plus, Filter, Trash2, CheckCircle2, Loader2, Calendar, FileText
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import { formatCurrency, formatCPF, formatDate, getBrasiliaISODate, formatPhone } from '../utils/formatters';
import { getSavingsTransactions, createSavingsTransaction, deleteSavingsTransaction } from '../supabase/services';
import './ModalDepositos.css';

const ModalDepositos = ({ isOpen, onClose, client, onBalanceUpdate }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showNewDepositForm, setShowNewDepositForm] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);

  // Form states for new deposit
  const [depositAmount, setDepositAmount] = useState('');
  const [depositInterestRate, setDepositInterestRate] = useState('1,50');
  const [depositDate, setDepositDate] = useState(getBrasiliaISODate());
  const [depositMethod, setDepositMethod] = useState('pix');
  const [depositNotes, setDepositNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Carrega transações do cliente
  const loadTransactions = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const res = await getSavingsTransactions({ clientId: client.id });
      if (res.success) {
        setTransactions(res.data || []);
      }
    } catch (err) {
      console.error('Error loading savings transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && client) {
      loadTransactions();
      setShowNewDepositForm(false);
      setFormError('');
    }
  }, [isOpen, client]);

  // Cálculos gerais de saldo (totais acumulados do cliente)
  const totals = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalInterest = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit') totalDeposits += amt;
      else if (t.type === 'withdrawal') totalWithdrawals += amt;
      else if (t.type === 'interest') totalInterest += amt;
      else if (t.type === 'adjustment') {
        if (amt >= 0) totalDeposits += amt;
        else totalWithdrawals += Math.abs(amt);
      }
    });

    const currentBalance = Math.max(0, (totalDeposits + totalInterest) - totalWithdrawals);

    return {
      currentBalance,
      totalDeposits,
      totalWithdrawals,
      totalInterest
    };
  }, [transactions]);

  // Notifica o componente pai sempre que os totais mudarem
  useEffect(() => {
    if (onBalanceUpdate && client) {
      onBalanceUpdate(client.id, totals.currentBalance);
    }
  }, [totals.currentBalance, client?.id]);

  // Lista de meses disponíveis para filtro
  const availableMonths = useMemo(() => {
    const monthsMap = new Map();

    // Mês atual como padrão na lista
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    monthsMap.set(currentMonthKey, `${monthNames[now.getMonth()]} / ${now.getFullYear()}`);

    transactions.forEach(t => {
      const dateStr = t.transaction_date || t.created_at;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = `${monthNames[d.getMonth()]} / ${d.getFullYear()}`;
          monthsMap.set(key, label);
        }
      }
    });

    return Array.from(monthsMap.entries()).map(([value, label]) => ({ value, label }));
  }, [transactions]);

  // Transações filtradas pelo mês selecionado
  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => {
      const dateStr = t.transaction_date || t.created_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  // Totais do período filtrado
  const filteredPeriodTotals = useMemo(() => {
    let dep = 0;
    let withdr = 0;
    let int = 0;
    filteredTransactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit') dep += amt;
      else if (t.type === 'withdrawal') withdr += amt;
      else if (t.type === 'interest') int += amt;
      else if (t.type === 'adjustment') {
        if (amt >= 0) dep += amt;
        else withdr += Math.abs(amt);
      }
    });
    return { deposits: dep, withdrawals: withdr, interest: int };
  }, [filteredTransactions]);

  // Manipula gravação de novo depósito
  const handleSaveDeposit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(depositAmount.replace(/\./g, '').replace(',', '.')) || 0;
    const parsedRate = parseFloat(depositInterestRate.replace(',', '.')) || 0;

    if (parsedAmount <= 0) {
      setFormError('Informe um valor válido para o depósito.');
      return;
    }

    setSavingDeposit(true);
    setFormError('');

    try {
      const payload = {
        client_id: client.id,
        type: 'deposit',
        amount: parsedAmount,
        interest_rate_month: parsedRate,
        transaction_date: depositDate || getBrasiliaISODate(),
        payment_method: depositMethod,
        notes: depositNotes.trim() || 'Aporte na carteira'
      };

      const res = await createSavingsTransaction(payload);
      if (res.success) {
        setDepositAmount('');
        setDepositNotes('');
        setShowNewDepositForm(false);
        await loadTransactions();
      } else {
        setFormError('Erro ao registrar depósito: ' + (res.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Error saving deposit:', err);
      setFormError('Erro ao registrar aporte: ' + err.message);
    } finally {
      setSavingDeposit(false);
    }
  };

  // Exclusão de transação
  const handleDeleteTransaction = async (tId) => {
    if (!confirm('Deseja realmente remover este lançamento da carteira?')) return;
    try {
      await deleteSavingsTransaction(tId);
      await loadTransactions();
    } catch (err) {
      alert('Erro ao excluir movimentação: ' + err.message);
    }
  };

  // Gerador e Disparador de Relatório para WhatsApp
  const handleSendWhatsAppReport = () => {
    if (!client) return;
    const phoneClean = (client.phone || '').replace(/\D/g, '');
    const clientName = client.name ? client.name.trim() : 'Cliente';

    // Rótulo do período
    let periodLabel = 'Extrato Geral Completo';
    if (selectedMonth !== 'all') {
      const found = availableMonths.find(m => m.value === selectedMonth);
      if (found) periodLabel = found.label;
    }

    // Emojis em sequências Unicode seguras (100% imunes a falhas de encoding de arquivo/OS)
    const E_BANK = '\u{1F3E6}';     // 🏦
    const E_USER = '\u{1F464}';     // 👤
    const E_DOC = '\u{1F4C4}';      // 📄
    const E_CALENDAR = '\u{1F4C5}'; // 📅
    const E_MONEY = '\u{1F4B0}';    // 💰
    const E_CHART = '\u{1F4CA}';    // 📊
    const E_IN = '\u{1F4E5}';       // 📥
    const E_OUT = '\u{1F4E4}';      // 📤
    const E_UP = '\u{1F4C8}';       // 📈
    const E_LIST = '\u{1F4CB}';     // 📋
    const E_CYCLE = '\u{1F504}';    // 🔄
    const DIVIDER = '━━━━━━━━━━━━━━━━━━━━';

    // Formata cada movimentação
    const movimentacoesFormatadas = filteredTransactions.length > 0
      ? filteredTransactions.map(t => {
          const dateStr = formatDate(t.transaction_date || t.created_at);
          const amt = formatCurrency(t.amount);
          if (t.type === 'deposit') {
            const taxaStr = Number(t.interest_rate_month) > 0 ? ` (${t.interest_rate_month}% a.m.)` : '';
            return `* ${dateStr} - ${E_IN} *DEPÓSITO:* +${amt}${taxaStr} [${(t.payment_method || 'PIX').toUpperCase()}]`;
          } else if (t.type === 'withdrawal') {
            return `* ${dateStr} - ${E_OUT} *SAQUE:* -${amt} [${(t.payment_method || 'PIX').toUpperCase()}]`;
          } else if (t.type === 'interest') {
            return `* ${dateStr} - ${E_UP} *RENDIMENTO:* +${amt}`;
          }
          return `* ${dateStr} - ${E_CYCLE} *AJUSTE:* ${amt}`;
        }).join('\n')
      : 'Nenhuma movimentação registrada neste período.';

    // Monta a mensagem completa estilo Ell Patron Luxury
    const mensagem = 
`${E_BANK} *ELL PATRON - EXTRATO DE POUPANÇA & DEPÓSITOS*

Olá, *${clientName}*! Segue o extrato detalhado da sua carteira de investimentos e poupança:

${E_USER} *Cliente:* ${clientName}
${E_DOC} *CPF:* ${formatCPF(client.cpf)}
${E_CALENDAR} *Período:* ${periodLabel}
${DIVIDER}
${E_MONEY} *SALDO TOTAL ACUMULADO:* *${formatCurrency(totals.currentBalance)}*
${DIVIDER}

${E_CHART} *RESUMO DO PERÍODO:*
${E_IN} *Total Aportado:* ${formatCurrency(filteredPeriodTotals.deposits)}
${E_OUT} *Total Resgatado:* ${formatCurrency(filteredPeriodTotals.withdrawals)}
${E_UP} *Rendimentos:* ${formatCurrency(filteredPeriodTotals.interest)}

${E_LIST} *DETALHAMENTO DAS MOVIMENTAÇÕES:*
${movimentacoesFormatadas}

${DIVIDER}
Qualquer dúvida sobre os lançamentos ou para novos aportes, estamos à disposição!
_Ell Patron • Gestão Financeira Inteligente_`;

    const url = phoneClean 
      ? `https://wa.me/55${phoneClean}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(url, '_blank');
  };

  if (!isOpen || !client) return null;

  return (
    <div className="modal-depositos-overlay" onClick={onClose}>
      <div className="modal-depositos-card" onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO */}
        <div className="modal-depositos-header">
          <div className="depositos-header-left">
            <div className="depositos-header-icon">
              <Landmark size={24} />
            </div>
            <div>
              <h3 className="depositos-header-title">Carteira & Poupança</h3>
              <p className="depositos-header-subtitle">
                <span>{client.name}</span>
                <span>•</span>
                <span>CPF: {formatCPF(client.cpf)}</span>
              </p>
            </div>
          </div>
          <button className="modal-depositos-close" onClick={onClose} aria-label="Fechar">
            <X size={22} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="modal-depositos-body">
          {/* BANNER DE SALDO E KPIs ANALÍTICOS */}
          <div className="depositos-balance-banner">
            <div className="depositos-banner-main">
              <span className="banner-main-label">
                <PiggyBank size={15} /> Saldo Total Acumulado
              </span>
              <span className="banner-main-value">
                {formatCurrency(totals.currentBalance)}
              </span>
            </div>

            <div className="depositos-kpi-card">
              <span className="depositos-kpi-label">Total Aportado</span>
              <span className="depositos-kpi-val text-emerald">
                +{formatCurrency(totals.totalDeposits)}
              </span>
            </div>

            <div className="depositos-kpi-card">
              <span className="depositos-kpi-label">Total Resgatado</span>
              <span className="depositos-kpi-val text-amber">
                -{formatCurrency(totals.totalWithdrawals)}
              </span>
            </div>

            <div className="depositos-kpi-card">
              <span className="depositos-kpi-label">Rendimentos</span>
              <span className="depositos-kpi-val text-gold">
                +{formatCurrency(totals.totalInterest)}
              </span>
            </div>
          </div>

          {/* BARRA DE CONTROLES (FILTRO DE MÊS & AÇÕES SUPERIORES) */}
          <div className="depositos-controls-bar">
            {/* Seletor de Mês Customizado C6 Carbon */}
            <div className="depositos-filter-select-box">
              <CustomSelect
                options={[
                  { value: 'all', label: 'Todos os Meses' },
                  ...availableMonths
                ]}
                value={selectedMonth}
                onChange={setSelectedMonth}
                icon={Filter}
                placeholder="Todos os Meses"
                className="depositos-custom-select"
              />
            </div>

            {/* Ações do Topo */}
            <div className="depositos-actions-top">
              <button 
                type="button" 
                className="btn-deposito-novo"
                onClick={() => setShowNewDepositForm(!showNewDepositForm)}
              >
                <Plus size={16} />
                <span>Novo Depósito</span>
              </button>

              <button 
                type="button" 
                className="btn-deposito-wpp"
                onClick={handleSendWhatsAppReport}
                title="Enviar Extrato via WhatsApp"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path fill="#ffffff" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.37 1 2.54c.12.17 1.73 2.65 4.2 3.71.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3z"/>
                </svg>
                <span>Relatório / WhatsApp</span>
              </button>
            </div>
          </div>

          {/* FORMULÁRIO DE NOVO DEPÓSITO (ACCORDION) */}
          {showNewDepositForm && (
            <form onSubmit={handleSaveDeposit} className="novo-deposito-panel">
              <h4 className="novo-deposito-title">
                <Plus size={16} /> Registrar Novo Depósito / Aporte
              </h4>

              <div className="novo-deposito-grid">
                <div className="dep-form-group">
                  <label>Valor do Aporte (R$)*</label>
                  <input
                    type="text"
                    className="dep-form-input"
                    placeholder="0,00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                    autoFocus
                    required
                  />
                </div>

                <div className="dep-form-group">
                  <label>Taxa de Juros Mensal (% a.m.)</label>
                  <input
                    type="text"
                    className="dep-form-input"
                    placeholder="1,50"
                    value={depositInterestRate}
                    onChange={(e) => setDepositInterestRate(e.target.value.replace(/[^0-9.,]/g, ''))}
                  />
                </div>

                <div className="dep-form-group">
                  <label>Data do Depósito</label>
                  <input
                    type="date"
                    className="dep-form-input"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    required
                  />
                </div>

                <div className="dep-form-group">
                  <CustomSelect
                    label="Forma de Pagamento"
                    options={[
                      { value: 'pix', label: 'PIX' },
                      { value: 'dinheiro', label: 'Dinheiro' },
                      { value: 'transferencia', label: 'Transferência / TED' },
                      { value: 'outro', label: 'Outro' }
                    ]}
                    value={depositMethod}
                    onChange={setDepositMethod}
                  />
                </div>

                <div className="dep-form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Observações / Finalidade</label>
                  <input
                    type="text"
                    className="dep-form-input"
                    placeholder="Ex: Aporte inicial para rendimento mensal"
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                  />
                </div>
              </div>

              {formError && (
                <span className="saque-error-text" style={{ margin: 0 }}>
                  {formError}
                </span>
              )}

              <div className="dep-form-actions">
                <button
                  type="button"
                  className="btn-dep-cancelar"
                  onClick={() => setShowNewDepositForm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-dep-salvar"
                  disabled={savingDeposit}
                >
                  {savingDeposit ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Salvar Aporte</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* LISTA DE HISTÓRICO DE MOVIMENTAÇÕES */}
          <div className="depositos-list-section">
            <div className="depositos-section-heading">
              <span>Histórico de Movimentações</span>
              <span>{filteredTransactions.length} lançamento(s)</span>
            </div>

            {loading ? (
              <div className="depositos-empty-state">
                <Loader2 size={24} className="animate-spin text-emerald" />
                <p>Carregando histórico financeiro...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="depositos-empty-state">
                <PiggyBank size={32} />
                <p>Nenhuma movimentação registrada no período selecionado.</p>
              </div>
            ) : (
              <div className="depositos-items-list">
                {filteredTransactions.map((item) => {
                  const isDeposit = item.type === 'deposit';
                  const isWithdrawal = item.type === 'withdrawal';
                  const isInterest = item.type === 'interest';

                  return (
                    <div key={item.id} className="depositos-item-card">
                      <div className="depositos-item-left">
                        <div className={`dep-type-icon-box ${item.type}`}>
                          {isDeposit ? (
                            <ArrowUpRight size={20} />
                          ) : isWithdrawal ? (
                            <ArrowDownLeft size={20} />
                          ) : (
                            <TrendingUp size={20} />
                          )}
                        </div>

                        <div className="dep-item-meta">
                          <div className="dep-item-title-row">
                            <span className="dep-item-type-label">
                              {isDeposit ? 'Depósito / Aporte' : isWithdrawal ? 'Saque / Resgate' : 'Rendimento Automático'}
                            </span>
                            {Number(item.interest_rate_month) > 0 && (
                              <span className="dep-item-rate-badge">
                                {item.interest_rate_month}% a.m.
                              </span>
                            )}
                          </div>
                          <span className="dep-item-notes">
                            {item.notes || `Movimentação via ${(item.payment_method || 'PIX').toUpperCase()}`}
                          </span>
                        </div>
                      </div>

                      <div className="depositos-item-right">
                        <div className="dep-item-values-box">
                          <span className={`dep-item-amount ${item.type}`}>
                            {isDeposit ? '+' : isWithdrawal ? '-' : '+'}{formatCurrency(item.amount)}
                          </span>
                          <span className="dep-item-date">
                            {formatDate(item.transaction_date || item.created_at)}
                          </span>
                        </div>

                        <button 
                          type="button"
                          className="dep-item-btn-del"
                          onClick={() => handleDeleteTransaction(item.id)}
                          title="Remover movimentação"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDepositos;

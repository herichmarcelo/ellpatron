import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRightLeft, ArrowUpRight, ArrowDownLeft, PiggyBank, 
  Search, Printer, Plus, Trash2, Calendar, TrendingUp,
  User, CheckCircle2, AlertCircle, Phone, FileText, Download,
  Wallet, ChevronRight, X
} from 'lucide-react';
import { formatCurrency, formatCPF, formatDate, formatPhone } from '../utils/formatters';
import { getSavingsTransactions, getClients, deleteSavingsTransaction } from '../supabase/services';
import { exportSavingsLedgerPDF } from '../utils/exportUtils';
import CustomSelect from '../components/CustomSelect';
import './ListaAportes.css';

const ListaAportes = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'deposit', 'withdrawal', 'interest'
  const [monthFilter, setMonthFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'

  // Carregar dados
  const loadData = async () => {
    setLoading(true);
    try {
      const [savingsRes, clientsRes] = await Promise.all([
        getSavingsTransactions(),
        getClients()
      ]);

      const clientsData = clientsRes.success ? (clientsRes.data || []) : [];
      setClients(clientsData);

      const clientsMap = {};
      clientsData.forEach(c => {
        clientsMap[c.id] = c;
      });

      if (savingsRes.success) {
        const enriched = (savingsRes.data || []).map(t => {
          const client = clientsMap[t.client_id] || {};
          return {
            ...t,
            client_name: client.name || t.client_name || 'Cliente Não Identificado',
            client_cpf: client.cpf || t.client_cpf || '',
            client_phone: client.phone || t.client_phone || '',
          };
        });
        setTransactions(enriched);
      }
    } catch (error) {
      console.error('Erro ao carregar lista de aportes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lista dinâmica de meses disponíveis
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    transactions.forEach(t => {
      const dStr = t.transaction_date || t.created_at;
      if (dStr) {
        const d = new Date(dStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        monthsSet.add(`${y}-${m}`);
      }
    });

    const monthsArr = Array.from(monthsSet).sort().reverse();
    return monthsArr.map(key => {
      const [y, m] = key.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return {
        value: key,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      };
    });
  }, [transactions]);

  // Filtragem e Ordenação
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filtro de Tipo
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Filtro de Mês
      if (monthFilter !== 'all') {
        const dStr = t.transaction_date || t.created_at;
        if (!dStr) return false;
        const d = new Date(dStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        if (`${y}-${m}` !== monthFilter) return false;
      }

      // Filtro de Busca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (t.client_name || '').toLowerCase().includes(q);
        const cpfMatch = (t.client_cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const notesMatch = (t.notes || '').toLowerCase().includes(q);
        const methodMatch = (t.payment_method || '').toLowerCase().includes(q);
        if (!nameMatch && !cpfMatch && !notesMatch && !methodMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.created_at).getTime();
      const dateB = new Date(b.transaction_date || b.created_at).getTime();
      const valA = Number(a.amount) || 0;
      const valB = Number(b.amount) || 0;

      if (sortOrder === 'newest') return dateB - dateA;
      if (sortOrder === 'oldest') return dateA - dateB;
      if (sortOrder === 'highest') return valB - valA;
      if (sortOrder === 'lowest') return valA - valB;
      return dateB - dateA;
    });
  }, [transactions, typeFilter, monthFilter, searchQuery, sortOrder]);

  // Totais Globais e do Filtro
  const totals = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    let interest = 0;

    filteredTransactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit') deposits += amt;
      else if (t.type === 'withdrawal') withdrawals += amt;
      else if (t.type === 'interest') interest += amt;
      else if (t.type === 'adjustment') {
        if (amt >= 0) deposits += amt;
        else withdrawals += Math.abs(amt);
      }
    });

    const currentBalance = Math.max(0, (deposits + interest) - withdrawals);

    return {
      deposits,
      withdrawals,
      interest,
      currentBalance,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Exclusão de lançamento
  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente remover esta movimentação?')) return;
    try {
      await deleteSavingsTransaction(id);
      await loadData();
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // Enviar comprovante individual via WhatsApp
  const handleSendWhatsAppProof = (t) => {
    const phoneClean = (t.client_phone || '').replace(/\D/g, '');
    const clientName = t.client_name || 'Cliente';
    const dateStr = formatDate(t.transaction_date || t.created_at);
    const amt = formatCurrency(t.amount);
    const isDeposit = t.type === 'deposit';

    const E_BANK = '\u{1F3E6}';
    const E_DOC = '\u{1F4C4}';
    const E_CAL = '\u{1F4C5}';
    const E_CHECK = '\u2705';
    const E_MONEY = '\u{1F4B0}';
    const DIVIDER = '━━━━━━━━━━━━━━━━━━━━';

    const tipoTexto = isDeposit ? 'COMPROVANTE DE APORTE / DEPÓSITO' : 'COMPROVANTE DE RESGATE / SAQUE';
    const sinal = isDeposit ? '+' : '-';

    const msg = 
`${E_BANK} *ELL PATRON - ${tipoTexto}*

Olá, *${clientName}*! Segue o registro da sua movimentação:

${E_DOC} *Cliente:* ${clientName}
${E_CAL} *Data:* ${dateStr}
*Forma:* ${(t.payment_method || 'PIX').toUpperCase()}
${DIVIDER}
${E_MONEY} *VALOR DA OPERAÇÃO:* *${sinal}${amt}*
${DIVIDER}

${E_CHECK} _Operação autenticada com sucesso no sistema Ell Patron._
_Ell Patron • Gestão Financeira Inteligente_`;

    const url = phoneClean 
      ? `https://wa.me/55${phoneClean}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  const handleDownloadPDF = () => {
    let periodLabel = 'Extrato Geral';
    if (monthFilter !== 'all') {
      const found = availableMonths.find(m => m.value === monthFilter);
      if (found) periodLabel = found.label;
    }
    exportSavingsLedgerPDF(totals, filteredTransactions, { periodLabel });
  };

  const handlePrint = () => {
    window.print();
  };

  const getClientInitials = (name) => {
    if (!name) return 'EP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="lista-aportes-page">
      {/* 0. CABEÇALHO & RESUMO TIMBRADO DE IMPRESSÃO (A4 OFICIAL) */}
      <div className="print-header-sheet">
        <div className="print-brand">
          <h2>ELL PATRON • GESTÃO FINANCEIRA</h2>
          <p>Relatório Consolidado de Aportes, Depósitos e Resgates de Carteira</p>
        </div>
        <div className="print-meta">
          <div><strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}</div>
          <div><strong>Registros:</strong> {filteredTransactions.length}</div>
          <div><strong>Período:</strong> {monthFilter === 'all' ? 'Todos os Meses' : (availableMonths.find(m => m.value === monthFilter)?.label || monthFilter)}</div>
        </div>
      </div>

      <div className="print-summary-box">
        <div className="print-stat-item">
          <span className="print-stat-label">Saldo Global:</span>
          <span className="print-stat-val print-gold">{formatCurrency(totals.currentBalance)}</span>
        </div>
        <div className="print-stat-item">
          <span className="print-stat-label">Total Aportado (+):</span>
          <span className="print-stat-val print-green">+{formatCurrency(totals.deposits)}</span>
        </div>
        <div className="print-stat-item">
          <span className="print-stat-label">Total Resgatado (-):</span>
          <span className="print-stat-val print-red">-{formatCurrency(totals.withdrawals)}</span>
        </div>
        <div className="print-stat-item">
          <span className="print-stat-label">Rendimentos Pagos:</span>
          <span className="print-stat-val print-blue">+{formatCurrency(totals.interest)}</span>
        </div>
      </div>

      {/* 1. CABEÇALHO & BOTÕES DE IMPRESSÃO / PDF */}
      <div className="aportes-header no-print">
        <div className="aportes-header-info">
          <div className="aportes-title-row">
            <div className="aportes-header-icon-box">
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <h1 className="aportes-title">Lista de Aportes & Extrato Geral</h1>
              <p className="aportes-subtitle">
                Controle unificado de depósitos, saques e rendimentos de todos os clientes
              </p>
            </div>
          </div>
        </div>

        <div className="aportes-header-actions no-print">
          <button 
            type="button" 
            className="btn-aportes-download" 
            onClick={handleDownloadPDF}
            title="Baixar Relatório em PDF A4 Formatado"
          >
            <Download size={16} />
            <span>Baixar PDF (A4)</span>
          </button>

          <button 
            type="button" 
            className="btn-aportes-print" 
            onClick={handlePrint}
            title="Imprimir Relatório"
          >
            <Printer size={16} />
            <span>Imprimir</span>
          </button>
          
          <button 
            type="button" 
            className="btn-aportes-novo"
            onClick={() => navigate('/lista-clientes')}
            title="Ir para Clientes para realizar novo Aporte"
          >
            <Plus size={16} />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* 2. KPI CARDS NO ESTILO C6 CARBON (NO-PRINT) */}
      <div className="aportes-kpis-grid no-print">
        {/* Card Saldo Global */}
        <div className="aporte-kpi-card aporte-kpi-card--gold">
          <div className="kpi-card-header">
            <div className="kpi-icon-wrap kpi-icon-wrap--gold">
              <Wallet size={16} />
            </div>
            <span className="kpi-title">Saldo Global em Carteira</span>
          </div>
          <div className="kpi-value">{formatCurrency(totals.currentBalance)}</div>
          <div className="kpi-footer">
            <span className="kpi-badge kpi-badge--gold">{totals.count} movimentações</span>
            <span className="kpi-detail">Patrimônio Gerenciado</span>
          </div>
        </div>

        {/* Card Total Entradas */}
        <div className="aporte-kpi-card aporte-kpi-card--green">
          <div className="kpi-card-header">
            <div className="kpi-icon-wrap kpi-icon-wrap--green">
              <ArrowUpRight size={16} />
            </div>
            <span className="kpi-title">Total Aportado (Entradas)</span>
          </div>
          <div className="kpi-value text-green">+{formatCurrency(totals.deposits)}</div>
          <div className="kpi-footer">
            <span className="kpi-badge kpi-badge--green">Entradas</span>
            <span className="kpi-detail">Depósitos Realizados</span>
          </div>
        </div>

        {/* Card Total Saídas */}
        <div className="aporte-kpi-card aporte-kpi-card--red">
          <div className="kpi-card-header">
            <div className="kpi-icon-wrap kpi-icon-wrap--red">
              <ArrowDownLeft size={16} />
            </div>
            <span className="kpi-title">Total Resgatado (Saídas)</span>
          </div>
          <div className="kpi-value text-red">-{formatCurrency(totals.withdrawals)}</div>
          <div className="kpi-footer">
            <span className="kpi-badge kpi-badge--red">Saídas</span>
            <span className="kpi-detail">Saques Efetuados</span>
          </div>
        </div>

        {/* Card Rendimentos */}
        <div className="aporte-kpi-card aporte-kpi-card--blue">
          <div className="kpi-card-header">
            <div className="kpi-icon-wrap kpi-icon-wrap--blue">
              <TrendingUp size={16} />
            </div>
            <span className="kpi-title">Rendimentos Pagos</span>
          </div>
          <div className="kpi-value">{formatCurrency(totals.interest)}</div>
          <div className="kpi-footer">
            <span className="kpi-badge kpi-badge--blue">Juros Poupança</span>
            <span className="kpi-detail">Lucro do Cliente</span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS & CONTROLES (NO-PRINT) */}
      <div className="aportes-controls-panel no-print">
        <div className="aportes-search-box">
          <Search size={16} className="aportes-search-icon" />
          <input
            type="text"
            className="aportes-search-input"
            placeholder="Buscar por cliente, CPF, observações ou forma de pagamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="aportes-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="aportes-filters-row">
          {/* Seletor de Tipo */}
          <div className="aportes-filter-item">
            <CustomSelect
              options={[
                { value: 'all', label: 'Todos os Tipos' },
                { value: 'deposit', label: '🟢 Entradas (Aportes)' },
                { value: 'withdrawal', label: '🔴 Saídas (Saques)' },
                { value: 'interest', label: '🔵 Rendimentos' }
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
              placeholder="Filtrar Tipo"
            />
          </div>

          {/* Seletor de Mês */}
          <div className="aportes-filter-item">
            <CustomSelect
              options={[
                { value: 'all', label: 'Todos os Meses' },
                ...availableMonths
              ]}
              value={monthFilter}
              onChange={setMonthFilter}
              icon={Calendar}
              placeholder="Filtrar por Mês"
            />
          </div>

          {/* Ordenação */}
          <div className="aportes-filter-item">
            <CustomSelect
              options={[
                { value: 'newest', label: 'Mais recentes primeiro' },
                { value: 'oldest', label: 'Mais antigos primeiro' },
                { value: 'highest', label: 'Maior valor' },
                { value: 'lowest', label: 'Menor valor' }
              ]}
              value={sortOrder}
              onChange={setSortOrder}
              placeholder="Ordenar por"
            />
          </div>
        </div>
      </div>

      {/* 4. TABELA / LISTAGEM DE APORTES */}
      <div className="aportes-table-card">
        {loading ? (
          <div className="aportes-empty-box">
            <p>Carregando movimentações...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="aportes-empty-box">
            <ArrowRightLeft size={36} />
            <p className="aportes-empty-title">Nenhuma movimentação encontrada</p>
            <span className="aportes-empty-subtitle">
              Altere os filtros de busca ou cadastre um novo aporte na carteira do cliente.
            </span>
          </div>
        ) : (
          <div className="aportes-table-responsive">
            <table className="aportes-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Forma</th>
                  <th>Observações</th>
                  <th className="text-right">Valor</th>
                  <th className="text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const isDep = t.type === 'deposit';
                  const isWith = t.type === 'withdrawal';
                  const isInt = t.type === 'interest';
                  const dateStr = formatDate(t.transaction_date || t.created_at);
                  const amt = Number(t.amount) || 0;

                  return (
                    <tr key={t.id} className="aporte-row">
                      {/* Cliente */}
                      <td>
                        <div className="aporte-client-cell">
                          <div className="aporte-client-avatar">
                            {getClientInitials(t.client_name)}
                          </div>
                          <div className="aporte-client-meta">
                            <span className="aporte-client-name">{t.client_name}</span>
                            {t.client_cpf && (
                              <span className="aporte-client-cpf">CPF: {formatCPF(t.client_cpf)}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Data */}
                      <td>
                        <div className="aporte-date-cell">
                          <Calendar size={13} className="no-print" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td>
                        {isDep && (
                          <span className="aporte-type-badge badge-dep">
                            <ArrowUpRight size={13} /> Entrada (Depósito)
                          </span>
                        )}
                        {isWith && (
                          <span className="aporte-type-badge badge-with">
                            <ArrowDownLeft size={13} /> Saída (Saque)
                          </span>
                        )}
                        {isInt && (
                          <span className="aporte-type-badge badge-int">
                            <TrendingUp size={13} /> Rendimento
                          </span>
                        )}
                        {!isDep && !isWith && !isInt && (
                          <span className="aporte-type-badge badge-adj">
                            Ajuste
                          </span>
                        )}
                      </td>

                      {/* Forma de Pagamento */}
                      <td>
                        <span className="aporte-method-pill">
                          {(t.payment_method || 'PIX').toUpperCase()}
                        </span>
                      </td>

                      {/* Observações / Taxa */}
                      <td>
                        <div className="aporte-notes-cell">
                          {Number(t.interest_rate_month) > 0 && (
                            <span className="aporte-rate-pill">
                              +{t.interest_rate_month}% a.m.
                            </span>
                          )}
                          <span className="aporte-notes-text">
                            {t.notes || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Valor Crucial: Verde para Entrada, Vermelho para Saída */}
                      <td className="text-right">
                        <span className={`aporte-amount-text ${isDep ? 'amount-green' : isWith ? 'amount-red' : 'amount-gold'}`}>
                          {isDep ? `+${formatCurrency(amt)}` : isWith ? `-${formatCurrency(amt)}` : `+${formatCurrency(amt)}`}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="text-center no-print">
                        <div className="aporte-actions-btns">
                          {t.client_phone && (
                            <button
                              type="button"
                              className="btn-action-wpp"
                              title="Enviar Comprovante via WhatsApp"
                              onClick={() => handleSendWhatsAppProof(t)}
                            >
                              <Phone size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-action-del"
                            title="Excluir Lançamento"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé da Tabela */}
        <div className="aportes-table-footer">
          <div className="table-footer-left">
            <span>Exibindo <strong>{filteredTransactions.length}</strong> lançamento(s)</span>
          </div>
          <div className="table-footer-right">
            <div className="footer-stat">
              <span>Total Entradas:</span>
              <strong className="text-green">+{formatCurrency(totals.deposits)}</strong>
            </div>
            <div className="footer-stat">
              <span>Total Saídas:</span>
              <strong className="text-red">-{formatCurrency(totals.withdrawals)}</strong>
            </div>
            <div className="footer-stat">
              <span>Saldo em Carteira:</span>
              <strong className="text-gold">{formatCurrency(totals.currentBalance)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaAportes;

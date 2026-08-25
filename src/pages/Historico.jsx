import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, DollarSign, Calendar, Download } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { formatCurrency } from '../utils/formatters';
import { getContracts, getPayments } from '../supabase/services.js';
import { exportHistoricoPDF, exportHistoricoExcel } from '../utils/exportUtils';
import './Historico.css';

const Historico = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [chartType, setChartType] = useState('bar');
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getContracts(), getPayments()])
      .then(([contractsRes, paymentsRes]) => {
        if (!isMounted) return;
        if (contractsRes.success) setContracts(contractsRes.data || []);
        if (paymentsRes.success) setPayments(paymentsRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Erro ao carregar dados financeiros:', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Aggregate time series data
  const aggregatedData = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    if (timeRange === 'month') {
      const monthsMap = {};
      
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
        monthsMap[key] = { label: key, month: key, receita: 0, despesa: 0, lucro: 0 };
      }

      contracts.forEach(c => {
        const d = new Date(c.loan_date || c.created_at);
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
        if (monthsMap[key]) {
          monthsMap[key].despesa += Number(c.principal || 0);
          monthsMap[key].lucro -= Number(c.principal || 0);
        }
      });

      payments.forEach(p => {
        const d = new Date(p.payment_date || p.created_at);
        const key = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
        if (monthsMap[key]) {
          monthsMap[key].receita += Number(p.amount || 0);
          monthsMap[key].lucro += Number(p.amount || 0);
        }
      });

      return Object.values(monthsMap);
    } else if (timeRange === 'week') {
      const weeks = [
        { label: 'Semana 1', week: 'Sem 1', receita: 0, despesa: 0, lucro: 0 },
        { label: 'Semana 2', week: 'Sem 2', receita: 0, despesa: 0, lucro: 0 },
        { label: 'Semana 3', week: 'Sem 3', receita: 0, despesa: 0, lucro: 0 },
        { label: 'Semana 4', week: 'Sem 4', receita: 0, despesa: 0, lucro: 0 }
      ];

      payments.forEach((p, idx) => {
        const targetWeek = weeks[idx % 4];
        targetWeek.receita += Number(p.amount || 0);
        targetWeek.lucro += Number(p.amount || 0);
      });

      contracts.forEach((c, idx) => {
        const targetWeek = weeks[idx % 4];
        targetWeek.despesa += Number(c.principal || 0);
        targetWeek.lucro -= Number(c.principal || 0);
      });

      return weeks;
    } else {
      const days = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        days.push({ label, day: label, dateStr: d.toISOString().split('T')[0], receita: 0, despesa: 0, lucro: 0 });
      }

      const daysMap = Object.fromEntries(days.map(d => [d.dateStr, d]));

      contracts.forEach(c => {
        const dateStr = (c.loan_date || c.created_at || '').split('T')[0];
        if (daysMap[dateStr]) {
          daysMap[dateStr].despesa += Number(c.principal || 0);
          daysMap[dateStr].lucro -= Number(c.principal || 0);
        }
      });

      payments.forEach(p => {
        const dateStr = (p.payment_date || p.created_at || '').split('T')[0];
        if (daysMap[dateStr]) {
          daysMap[dateStr].receita += Number(p.amount || 0);
          daysMap[dateStr].lucro += Number(p.amount || 0);
        }
      });

      return days;
    }
  }, [contracts, payments, timeRange]);

  // Aggregate totals
  const totalRevenue = useMemo(() => {
    const fromPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return fromPayments > 0 ? fromPayments : contracts.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
  }, [payments, contracts]);

  const totalExpenses = useMemo(() => {
    return contracts.reduce((sum, c) => sum + Number(c.principal || 0), 0);
  }, [contracts]);

  const totalProfit = totalRevenue - totalExpenses;

  // Status Pie Data
  const loanStatusData = useMemo(() => {
    const counts = { open: 0, paid: 0, overdue: 0, cancelled: 0 };
    contracts.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
      else counts.open++;
    });

    const list = [
      { name: 'Em Aberto', value: counts.open, color: '#FFD700' },
      { name: 'Pagos', value: counts.paid, color: '#10B981' },
      { name: 'Em Atraso', value: counts.overdue, color: '#EF4444' },
      { name: 'Cancelados', value: counts.cancelled, color: '#6B7280' }
    ].filter(item => item.value > 0);

    return list.length > 0 ? list : [{ name: 'Sem dados', value: 1, color: '#333333' }];
  }, [contracts]);

  // Investment Volume Distribution Pie
  const investmentData = useMemo(() => {
    let tier1 = 0;
    let tier2 = 0;
    let tier3 = 0;

    contracts.forEach(c => {
      const p = Number(c.principal || 0);
      if (p < 5000) tier1 += p;
      else if (p <= 20000) tier2 += p;
      else tier3 += p;
    });

    const list = [
      { name: 'Até R$ 5k', value: tier1, color: '#D4AF37' },
      { name: 'R$ 5k - 20k', value: tier2, color: '#FFD700' },
      { name: 'Acima de R$ 20k', value: tier3, color: '#3B82F6' }
    ].filter(item => item.value > 0);

    return list.length > 0 ? list : [{ name: 'Sem dados', value: 1, color: '#333333' }];
  }, [contracts]);

  const handleExport = (format) => {
    const summary = { totalRevenue, totalExpenses, totalProfit };
    if (format === 'pdf') {
      const periodLabel = timeRange === 'month' ? 'Mensal' : timeRange === 'week' ? 'Semanal' : 'Diário';
      exportHistoricoPDF(summary, aggregatedData, periodLabel);
    } else if (format === 'excel') {
      exportHistoricoExcel(summary, aggregatedData, timeRange);
    }
  };

  return (
    <div className="historico">
      <div className="historico-header">
        <h2>Histórico Financeiro</h2>
        <div className="historico-actions">
          <Button
            variant="secondary"
            size="small"
            icon={Download}
            onClick={() => handleExport('pdf')}
          >
            Exportar PDF
          </Button>
          <Button
            variant="secondary"
            size="small"
            icon={Download}
            onClick={() => handleExport('excel')}
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="historico-controls">
        <div className="historico-filters">
          <span className="historico-filter-label">Período:</span>
          <Button
            variant={timeRange === 'day' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setTimeRange('day')}
          >
            Dia
          </Button>
          <Button
            variant={timeRange === 'week' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setTimeRange('week')}
          >
            Semana
          </Button>
          <Button
            variant={timeRange === 'month' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setTimeRange('month')}
          >
            Mês
          </Button>
        </div>

        <div className="historico-chart-type">
          <span className="historico-filter-label">Gráfico:</span>
          <Button
            variant={chartType === 'bar' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setChartType('bar')}
          >
            Barras
          </Button>
          <Button
            variant={chartType === 'line' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setChartType('line')}
          >
            Linha
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="historico-summary">
        <Card className="historico-summary-card">
          <div className="historico-summary-content">
            <DollarSign size={24} className="historico-summary-icon" />
            <div>
              <span className="historico-summary-label">Receita Total</span>
              <span className="historico-summary-value">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </Card>

        <Card className="historico-summary-card historico-summary-card--expense">
          <div className="historico-summary-content">
            <TrendingUp size={24} className="historico-summary-icon" />
            <div>
              <span className="historico-summary-label">Capital Investido</span>
              <span className="historico-summary-value">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </Card>

        <Card className="historico-summary-card historico-summary-card--profit">
          <div className="historico-summary-content">
            <Calendar size={24} className="historico-summary-icon" />
            <div>
              <span className="historico-summary-label">Resultado Líquido</span>
              <span className={`historico-summary-value ${totalProfit >= 0 ? '' : 'historico-summary-value--negative'}`}>
                {formatCurrency(totalProfit)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="historico-loading">Carregando dados financeiros...</div>
      ) : (
        <>
          {/* Main Chart */}
          <Card className="historico-chart-card">
            <div className="historico-chart-header">
              <h3>Evolução Financeira</h3>
              <Badge variant="gold">{timeRange === 'day' ? 'Diário' : timeRange === 'week' ? 'Semanal' : 'Mensal'}</Badge>
            </div>
            <div className="historico-chart-container">
              <ResponsiveContainer width="100%" height={320}>
                {chartType === 'bar' ? (
                  <BarChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val) => formatCurrency(Number(val))}
                    />
                    <Legend />
                    <Bar dataKey="receita" name="Receita" fill="#FFD700" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" name="Capital Investido" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lucro" name="Resultado" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val) => formatCurrency(Number(val))}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="receita" name="Receita" stroke="#FFD700" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="despesa" name="Capital Investido" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="lucro" name="Resultado" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Pie Charts */}
          <div className="historico-pie-charts">
            <Card className="historico-pie-card">
              <h3>Status dos Contratos</h3>
              <div className="historico-pie-container">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={loanStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {loanStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="historico-pie-card">
              <h3>Distribuição de Capital Emprestado</h3>
              <div className="historico-pie-container">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={investmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {investmentData.map((entry, index) => (
                        <Cell key={`cell-inv-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Historico;
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Download, Filter } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { formatCurrency } from '../utils/formatters';
import './Historico.css';

const Historico = ({ onPageChange }) => {
  useEffect(() => {
    if (onPageChange) onPageChange('historico');
  }, [onPageChange]);
  const [timeRange, setTimeRange] = useState('month');
  const [chartType, setChartType] = useState('bar');

  // Empty data - will be populated from real data source
  const monthlyData = [];
  const weeklyData = [];
  const dailyData = [];
  const loanStatusData = [];
  const investmentData = [];

  const getCurrentData = () => {
    switch (timeRange) {
      case 'week':
        return weeklyData;
      case 'day':
        return dailyData;
      default:
        return monthlyData;
    }
  };

  const handleExport = (format) => {
    console.log(`Export as ${format}`);
    // Implement export functionality
  };

  const currentData = getCurrentData();
  const totalRevenue = currentData.reduce((sum, item) => sum + item.receita, 0);
  const totalExpenses = currentData.reduce((sum, item) => sum + item.despesa, 0);
  const totalProfit = currentData.reduce((sum, item) => sum + item.lucro, 0);

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
              <span className="historico-summary-label">Despesas Totais</span>
              <span className="historico-summary-value">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </Card>

        <Card className="historico-summary-card historico-summary-card--profit">
          <div className="historico-summary-content">
            <Calendar size={24} className="historico-summary-icon" />
            <div>
              <span className="historico-summary-label">Lucro Líquido</span>
              <span className="historico-summary-value">{formatCurrency(totalProfit)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="historico-chart-card">
        <div className="historico-chart-header">
          <h3>Evolução Financeira</h3>
          <Badge variant="gold">{timeRange === 'day' ? 'Diário' : timeRange === 'week' ? 'Semanal' : 'Mensal'}</Badge>
        </div>
        <div className="historico-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'bar' ? (
              <BarChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey={timeRange === 'month' ? 'month' : timeRange === 'week' ? 'week' : 'day'} stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="#FFD700" />
                <Bar dataKey="despesa" name="Despesas" fill="#F44336" />
                <Bar dataKey="lucro" name="Lucro" fill="#4CAF50" />
              </BarChart>
            ) : (
              <LineChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey={timeRange === 'month' ? 'month' : timeRange === 'week' ? 'week' : 'day'} stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="receita" name="Receita" stroke="#FFD700" strokeWidth={2} />
                <Line type="monotone" dataKey="despesa" name="Despesas" stroke="#F44336" strokeWidth={2} />
                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#4CAF50" strokeWidth={2} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Pie Charts */}
      <div className="historico-pie-charts">
        <Card className="historico-pie-card">
          <h3>Status dos Empréstimos</h3>
          <div className="historico-pie-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={loanStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
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
          <h3>Distribuição de Investimentos</h3>
          <div className="historico-pie-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={investmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {investmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Historico;
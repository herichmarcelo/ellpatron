import React, { useState } from 'react';
import { AlertTriangle, Clock, Sparkles, Phone, Calendar } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import './Atrasados.css';

const Atrasados = ({ onPageChange }) => {
  React.useEffect(() => {
    if (onPageChange) onPageChange('atrasados');
  }, [onPageChange]);
  
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="atrasados">
      <div className="atrasados-header">
        <div className="atrasados-title">
          <AlertTriangle size={24} />
          <h1>Pagamentos em Atraso</h1>
        </div>
        
        <div className="atrasados-summary">
          <Card className="atrasados-summary-card">
            <div className="atrasados-summary-content">
              <Clock size={20} className="atrasados-summary-icon" />
              <div>
                <span className="atrasados-summary-label">Total de atrasos</span>
                <span className="atrasados-summary-value">0 atraso(s)</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="atrasados-controls">
        <div className="atrasados-search">
          <Input
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={setSearchQuery}
            fullWidth
          />
        </div>
      </div>

      <div className="atrasados-list">
        <Card className="atrasados-empty">
          <div className="atrasados-empty-content">
            <div className="atrasados-empty-icon">
              <Sparkles size={48} />
            </div>
            <h3 className="atrasados-empty-title">Nenhum pagamento em atraso</h3>
            <p className="atrasados-empty-description">
              Excelente! Todos os pagamentos estão em dia. Continue monitorando seus clientes.
            </p>
            <Button 
              variant="primary" 
              className="atrasados-empty-btn"
              icon={Calendar}
            >
              Ver Lista de Clientes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Atrasados;
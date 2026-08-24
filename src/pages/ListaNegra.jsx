import React, { useState } from 'react';
import { Ban, Sparkles, ShieldCheck } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import './ListaNegra.css';

const ListaNegra = ({ onPageChange }) => {
  React.useEffect(() => {
    if (onPageChange) onPageChange('lista-negra');
  }, [onPageChange]);
  
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="lista-negra">
      <div className="lista-negra-header">
        <div className="lista-negra-title">
          <Ban size={24} />
          <h1>Lista Negra</h1>
        </div>
        <Badge variant="gold">0 empréstimo(s)</Badge>
      </div>

      <div className="lista-negra-controls">
        <div className="lista-negra-search">
          <Input
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={setSearchQuery}
            fullWidth
          />
        </div>
      </div>

      <div className="lista-negra-list">
        <Card className="lista-negra-empty">
          <div className="lista-negra-empty-content">
            <div className="lista-negra-empty-icon">
              <ShieldCheck size={48} />
            </div>
            <h3 className="lista-negra-empty-title">Lista Negra Vazia</h3>
            <p className="lista-negra-empty-description">
              Excelente! Não há clientes bloqueados no momento. Continue mantendo um controle rigoroso dos seus contratos para evitar necessidade de bloqueios.
            </p>
            <Button 
              variant="primary" 
              className="lista-negra-empty-btn"
            >
              Ver Todos os Contratos
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ListaNegra;
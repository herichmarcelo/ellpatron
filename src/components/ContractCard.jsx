import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

const ContractCard = ({ contract, onViewPayments }) => {
  const isPaid = contract.status === 'paid' || contract.status === 'QUITADO';
  const [isExpanded, setIsExpanded] = useState(!isPaid);

  const statusLabel = contract.status === 'open' 
    ? 'EM ABERTO' 
    : isPaid 
    ? 'QUITADO' 
    : contract.status === 'overdue' 
    ? 'EM ATRASO' 
    : (contract.status || '').toUpperCase();

  const badgeClass = contract.status === 'open' 
    ? 'c6-badge-open' 
    : isPaid 
    ? 'c6-badge-paid' 
    : 'c6-badge-overdue';

  return (
    <div className={`c6-contract-card ${isPaid ? 'c6-contract-card--paid' : ''} ${!isExpanded ? 'c6-contract-card--collapsed' : ''}`}>
      {/* Topo do Card: ID, Status e Seta Chevron */}
      <div 
        className="c6-card-header c6-card-header--clickable"
        onClick={() => setIsExpanded(prev => !prev)}
        role="button"
        tabIndex={0}
        title={isExpanded ? 'Clique para recolher' : 'Clique para expandir'}
      >
        <div className="c6-contract-id">
          <FileText size={16} color="#EAB308" />
          <span>#{contract.protocol_number}</span>
        </div>
        
        <div className="c6-card-header-right">
          <span className={`c6-badge ${badgeClass}`}>{statusLabel}</span>
          <ChevronDown 
            size={18} 
            className={`c6-contract-chevron ${isExpanded ? 'c6-contract-chevron--expanded' : ''}`} 
          />
        </div>
      </div>

      {/* Corpo do Contrato Expandido */}
      {isExpanded && (
        <div className="c6-contract-body">
          {/* Grade 2x2 de Informações */}
          <div className="contract-mini-cards-grid">
            {/* Linha 1: Datas */}
            <div className="mini-card card-date">
              <span className="mini-card-label">Emissão</span>
              <span className="mini-card-value">{formatDate(contract.loan_date || contract.created_at)}</span>
            </div>
            <div className="mini-card card-date">
              <span className="mini-card-label">Vencimento</span>
              <span className="mini-card-value">{formatDate(contract.due_date)}</span>
            </div>

            {/* Linha 2: Valores */}
            <div className="mini-card card-money">
              <span className="mini-card-label">Valor Principal</span>
              <span className="mini-card-value">{formatCurrency(contract.principal)}</span>
            </div>
            <div className="mini-card card-money">
              <span className="mini-card-label">Parcelamento</span>
              <span className="mini-card-value">
                {contract.installments_count || contract.installments || 1}x {formatCurrency(contract.monthly_installment || contract.principal)}
              </span>
            </div>
          </div>

          {/* Valor Total em Linha Única */}
          <div className="contract-total-inline">
            <span className="total-inline-label">Valor Total</span>
            <span className="total-inline-value text-gold">
              {formatCurrency(contract.total_amount || contract.total_original || contract.principal)}
            </span>
          </div>

          {/* Botão de Ação */}
          <button 
            type="button"
            className="c6-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onViewPayments(contract);
            }}
          >
            <span>Ver Pagamentos</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ContractCard;

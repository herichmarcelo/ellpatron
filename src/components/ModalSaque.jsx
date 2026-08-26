import React, { useState } from 'react';
import { 
  X, ArrowDownLeft, Wallet, QrCode, Banknote, Building, 
  CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';
import { formatCurrency, formatCPF, getInitials, stringToColor } from '../utils/formatters';
import { createSavingsTransaction } from '../supabase/services';
import './ModalSaque.css';

const ModalSaque = ({ isOpen, onClose, client, currentBalance = 0, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [pixKey, setPixKey] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !client) return null;

  const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  const isInvalidAmount = parsedAmount <= 0;
  const isExceedingBalance = parsedAmount > (currentBalance + 0.0001);
  const remainingBalance = Math.max(0, currentBalance - (parsedAmount || 0));

  const handleSetMax = () => {
    if (currentBalance <= 0) return;
    setAmount(currentBalance.toFixed(2).replace('.', ','));
    setError('');
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    // Permite apenas números e vírgula
    if (/^[0-9.,]*$/.test(val)) {
      setAmount(val);
      setError('');
    }
  };

  const handleConfirmWithdrawal = async (e) => {
    e.preventDefault();

    if (isInvalidAmount) {
      setError('Informe um valor válido para o saque.');
      return;
    }

    if (isExceedingBalance) {
      setError(`Saldo insuficiente. Saldo disponível: ${formatCurrency(currentBalance)}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const transactionData = {
        client_id: client.id,
        type: 'withdrawal',
        amount: parsedAmount,
        interest_rate_month: 0,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        notes: [
          notes.trim(),
          pixKey.trim() ? `Chave/Favorecido: ${pixKey.trim()}` : ''
        ].filter(Boolean).join(' | ') || 'Saque efetuado via ' + paymentMethod.toUpperCase()
      };

      const result = await createSavingsTransaction(transactionData);

      if (result.success) {
        if (onSuccess) {
          onSuccess(result.data || transactionData);
        }
        onClose();
      } else {
        setError('Erro ao registrar saque: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Error during withdrawal:', err);
      setError('Erro ao processar saque: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-saque-overlay" onClick={onClose}>
      <div className="modal-saque-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="modal-saque-header">
          <div className="modal-saque-title-group">
            <div className="modal-saque-icon-badge">
              <ArrowDownLeft size={22} />
            </div>
            <div>
              <h3 className="modal-saque-title">Resgate de Saldo</h3>
              <p className="modal-saque-subtitle">Retirada da carteira de depósitos</p>
            </div>
          </div>
          <button className="modal-saque-close" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleConfirmWithdrawal} className="modal-saque-body">
          {/* Identificação do Cliente */}
          <div className="saque-cliente-info">
            <div 
              className="saque-cliente-avatar"
              style={{ backgroundColor: stringToColor(client.name) }}
            >
              {getInitials(client.name)}
            </div>
            <div className="saque-cliente-meta">
              <h4>{client.name}</h4>
              <span>CPF: {formatCPF(client.cpf)}</span>
            </div>
          </div>

          {/* Card de Saldo Disponível */}
          <div className="saque-saldo-disponivel-card">
            <span className="saque-saldo-label">
              <Wallet size={16} /> Saldo Disponível
            </span>
            <span className="saque-saldo-valor">
              {formatCurrency(currentBalance)}
            </span>
          </div>

          {/* Campo de Valor do Saque */}
          <div className="saque-field-group">
            <div className="saque-label-row">
              <label className="saque-field-label">Valor do Saque</label>
              <button 
                type="button" 
                className="saque-btn-max"
                onClick={handleSetMax}
                disabled={currentBalance <= 0}
              >
                Sacar Tudo
              </button>
            </div>
            <div className="saque-input-wrapper">
              <span className="saque-input-prefix">R$</span>
              <input
                type="text"
                className={`saque-input ${error || isExceedingBalance ? 'input-error' : ''}`}
                placeholder="0,00"
                value={amount}
                onChange={handleAmountChange}
                autoFocus
              />
            </div>
            {(error || (isExceedingBalance && parsedAmount > 0)) && (
              <span className="saque-error-text">
                <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                {error || 'Valor do saque excede o saldo disponível.'}
              </span>
            )}
          </div>

          {/* Seleção do Método de Pagamento */}
          <div className="saque-field-group">
            <label className="saque-field-label">Forma de Retirada</label>
            <div className="saque-metodos-grid">
              <button
                type="button"
                className={`saque-metodo-btn ${paymentMethod === 'pix' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('pix')}
              >
                <QrCode size={18} />
                <span>PIX</span>
              </button>
              <button
                type="button"
                className={`saque-metodo-btn ${paymentMethod === 'dinheiro' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('dinheiro')}
              >
                <Banknote size={18} />
                <span>Dinheiro</span>
              </button>
              <button
                type="button"
                className={`saque-metodo-btn ${paymentMethod === 'transferencia' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('transferencia')}
              >
                <Building size={18} />
                <span>TED / Conta</span>
              </button>
            </div>
          </div>

          {/* Chave PIX ou Conta */}
          {paymentMethod === 'pix' && (
            <div className="saque-field-group">
              <label className="saque-field-label">Chave PIX de Destino (Opcional)</label>
              <input
                type="text"
                className="saque-text-input"
                placeholder="CPF, Telefone, E-mail ou Aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>
          )}

          {paymentMethod === 'transferencia' && (
            <div className="saque-field-group">
              <label className="saque-field-label">Banco, Agência e Conta</label>
              <input
                type="text"
                className="saque-text-input"
                placeholder="Ex: Nubank - Ag 0001 - Cc 123456-7"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>
          )}

          {/* Observações */}
          <div className="saque-field-group">
            <label className="saque-field-label">Observações / Motivo</label>
            <input
              type="text"
              className="saque-text-input"
              placeholder="Ex: Resgate solicitado pelo cliente"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Resumo / Projeção */}
          {parsedAmount > 0 && !isExceedingBalance && (
            <div className="saque-projecao-box">
              <span className="saque-projecao-label">Saldo restante após o saque:</span>
              <span className="saque-projecao-valor">{formatCurrency(remainingBalance)}</span>
            </div>
          )}
        </form>

        {/* Rodapé / Ações */}
        <div className="modal-saque-footer">
          <button 
            type="button" 
            className="saque-btn-cancelar" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            className="saque-btn-confirmar" 
            onClick={handleConfirmWithdrawal}
            disabled={loading || isInvalidAmount || isExceedingBalance || currentBalance <= 0}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Confirmar Saque</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalSaque;

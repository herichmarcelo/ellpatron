import React, { useState, useEffect } from 'react';
import { Ban, ShieldCheck, Search, MessageCircle, RotateCcw, AlertOctagon } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { formatCurrency, formatDate, formatCPF } from '../utils/formatters';
import { getBlacklist, removeFromBlacklist } from '../supabase/services.js';
import './ListaNegra.css';

const ListaNegra = () => {
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshBlacklist = () => {
    getBlacklist().then((result) => {
      if (result.success) {
        setBlacklist(result.data || []);
      }
    });
  };

  useEffect(() => {
    let isMounted = true;

    getBlacklist()
      .then((result) => {
        if (!isMounted) return;
        if (result.success) {
          setBlacklist(result.data || []);
        }
        setLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Erro ao carregar lista negra:', error);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRemove = async (item) => {
    if (confirm(`Tem certeza que deseja remover ${item.client_name || 'o cliente'} da Lista Negra?`)) {
      try {
        const result = await removeFromBlacklist(item.id, item.client_id);
        if (result.success) {
          alert('Cliente removido da Lista Negra com sucesso!');
          refreshBlacklist();
        } else {
          alert('Erro ao remover: ' + result.error);
        }
      } catch (err) {
        alert('Erro ao remover: ' + err.message);
      }
    }
  };

  const handleWhatsApp = (item) => {
    const rawPhone = (item.client_phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${item.client_name}, constam restrições ativas em seu cadastro no sistema Ell Patron referente ao débito de ${formatCurrency(item.total_debt || item.principal)}. Entre em contato para negociação e remoção da restrição.`
    );
    if (rawPhone) {
      window.open(`https://wa.me/55${rawPhone}?text=${message}`, '_blank');
    } else {
      const phoneInput = prompt('Digite o telefone WhatsApp com DDD:');
      if (phoneInput) {
        window.open(`https://wa.me/55${phoneInput.replace(/\D/g, '')}?text=${message}`, '_blank');
      }
    }
  };

  const filteredList = blacklist.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      (item.client_name && item.client_name.toLowerCase().includes(query)) ||
      (item.client_cpf && item.client_cpf.includes(query)) ||
      (item.protocol_number && item.protocol_number.toLowerCase().includes(query)) ||
      (item.reason && item.reason.toLowerCase().includes(query))
    );
  });

  const totalBlockedDebt = blacklist.reduce((sum, item) => sum + (item.total_debt || item.principal || 0), 0);

  return (
    <div className="lista-negra">
      <div className="lista-negra-header">
        <div className="lista-negra-title">
          <Ban size={24} />
          <h1>Lista Negra de Inadimplência</h1>
        </div>
      </div>

      <div className="lista-negra-summary-group">
        <Card className="lista-negra-summary-card">
          <div className="lista-negra-summary-content">
            <div className="lista-negra-summary-icon">
              <AlertOctagon size={22} />
            </div>
            <div>
              <span className="lista-negra-summary-label">Clientes Bloqueados</span>
              <span className="lista-negra-summary-value text-blue">{blacklist.length}</span>
            </div>
          </div>
        </Card>

        <Card className="lista-negra-summary-card lista-negra-summary-card--danger">
          <div className="lista-negra-summary-content">
            <div className="lista-negra-summary-icon lista-negra-summary-icon--danger">
              <Ban size={22} />
            </div>
            <div>
              <span className="lista-negra-summary-label">Dívida Bloqueada</span>
              <span className="lista-negra-summary-value text-red">{formatCurrency(totalBlockedDebt)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="lista-negra-controls">
        <div className="lista-negra-search">
          <Input
            icon={Search}
            placeholder="Buscar por cliente, CPF, protocolo ou motivo..."
            value={searchQuery}
            onChange={setSearchQuery}
            fullWidth
          />
        </div>
      </div>

      {loading ? (
        <div className="lista-negra-loading">Carregando lista de restrições...</div>
      ) : filteredList.length === 0 ? (
        <Card className="lista-negra-empty">
          <div className="lista-negra-empty-content">
            <div className="lista-negra-empty-icon">
              <ShieldCheck size={48} />
            </div>
            <h3 className="lista-negra-empty-title">Lista Negra Vazia</h3>
            <p className="lista-negra-empty-description">
              Excelente! Nenhum cliente possui restrição crítica ativa no momento.
            </p>
          </div>
        </Card>
      ) : (
        <div className="lista-negra-grid">
          {filteredList.map(item => (
            <Card key={item.id} className="lista-negra-card">
              <div className="lista-negra-card-header">
                <div>
                  <h3 className="lista-negra-client-name">{item.client_name || 'Cliente'}</h3>
                  <span className="lista-negra-cpf">CPF: {formatCPF(item.client_cpf || '')}</span>
                </div>
                <Badge variant="red">Bloqueado</Badge>
              </div>

              <div className="lista-negra-details">
                {item.protocol_number && (
                  <div className="lista-negra-row">
                    <span className="lista-negra-label">Protocolo:</span>
                    <span className="lista-negra-val">{item.protocol_number}</span>
                  </div>
                )}
                <div className="lista-negra-row">
                  <span className="lista-negra-label">Valor do Débito:</span>
                  <span className="lista-negra-val lista-negra-val--debt">
                    {formatCurrency(item.total_debt || item.principal || 0)}
                  </span>
                </div>
                {item.days_overdue > 0 && (
                  <div className="lista-negra-row">
                    <span className="lista-negra-label">Dias de Atraso:</span>
                    <span className="lista-negra-val">{item.days_overdue} dias</span>
                  </div>
                )}
                <div className="lista-negra-row">
                  <span className="lista-negra-label">Data de Inclusão:</span>
                  <span className="lista-negra-val">{formatDate(item.added_at || item.created_at)}</span>
                </div>
                <div className="lista-negra-reason-box">
                  <span className="lista-negra-reason-label">Motivo do Bloqueio:</span>
                  <p className="lista-negra-reason-text">{item.reason}</p>
                </div>
              </div>

              <div className="lista-negra-actions">
                <Button
                  variant="secondary"
                  size="small"
                  icon={MessageCircle}
                  onClick={() => handleWhatsApp(item)}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  icon={RotateCcw}
                  onClick={() => handleRemove(item)}
                >
                  Desbloquear
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListaNegra;
import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Award, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import './CreditScoreCard.css';

const CreditScoreCard = ({ scoreData, variant = 'full', className = '' }) => {
  if (!scoreData) return null;

  const { score, tier, tierLabel, color, recommendation, metrics } = scoreData;

  // Calculo de porcentagem para o arco circular / barra
  const percentage = Math.min(Math.max((score / 1000) * 100, 0), 100);

  // Variante Badge Minimalista (para cards de clientes ou tabelas)
  if (variant === 'badge') {
    return (
      <span 
        className={`score-pill-badge score-pill-badge--${tier} ${className}`}
        style={{ borderColor: color, color: color }}
        title={`Score de Crédito: ${score}/1000 (${tierLabel})`}
      >
        <span className="score-dot" style={{ backgroundColor: color }} />
        <span className="score-num">{score}</span>
        <span className="score-sep">•</span>
        <span className="score-tier">{tierLabel}</span>
      </span>
    );
  }

  // Variante Compacta (para formulários e simulações rápidas)
  if (variant === 'compact') {
    return (
      <div className={`score-compact-card score-compact--${tier} ${className}`}>
        <div className="score-compact-top">
          <div className="score-compact-title">
            <TrendingUp size={16} style={{ color }} />
            <span>Score do Cliente</span>
          </div>
          <span 
            className="score-compact-badge"
            style={{ backgroundColor: `${color}1A`, color: color, borderColor: `${color}40` }}
          >
            {tierLabel}
          </span>
        </div>

        <div className="score-compact-main">
          <div className="score-compact-number" style={{ color }}>
            {score}
            <span className="score-compact-max">/1000</span>
          </div>
          <div className="score-bar-bg">
            <div 
              className="score-bar-fill" 
              style={{ width: `${percentage}%`, backgroundColor: color }} 
            />
          </div>
        </div>
        <p className="score-compact-desc">{recommendation}</p>
      </div>
    );
  }

  // Variante Completa (Full para Modal de Perfil e Análise Completa de Crédito)
  return (
    <div className={`c6-score-card c6-score-card--${tier} ${className}`}>
      {/* Cabeçalho do Score */}
      <div className="c6-score-header">
        <div className="c6-score-title-group">
          {tier === 'high' ? (
            <ShieldCheck size={20} className="score-icon-high" />
          ) : tier === 'medium' ? (
            <ShieldAlert size={20} className="score-icon-medium" />
          ) : (
            <AlertTriangle size={20} className="score-icon-low" />
          )}
          <div>
            <h4 className="c6-score-title">Score de Crédito</h4>
            <span className="c6-score-subtitle">Análise automatizada de confiabilidade financeira</span>
          </div>
        </div>

        <span 
          className="c6-score-tier-pill"
          style={{ backgroundColor: `${color}18`, color: color, borderColor: `${color}40` }}
        >
          {tierLabel.toUpperCase()}
        </span>
      </div>

      {/* Medidor Central e Destaque Numérico */}
      <div className="c6-score-gauge-section">
        <div className="c6-score-dial-wrap">
          <svg className="c6-score-dial-svg" viewBox="0 0 120 70">
            {/* Arco de fundo */}
            <path
              d="M 10 65 A 50 50 0 0 1 110 65"
              fill="none"
              stroke="#29292E"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Arco colorido de progresso */}
            <path
              d="M 10 65 A 50 50 0 0 1 110 65"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="157"
              strokeDashoffset={157 - (157 * (percentage / 100))}
              className="c6-score-arc-anim"
            />
          </svg>
          <div className="c6-score-dial-val">
            <span className="dial-num" style={{ color }}>{score}</span>
            <span className="dial-max">/1000</span>
          </div>
        </div>

        <div className="c6-score-status-text">
          <p className="c6-score-recommendation">{recommendation}</p>
        </div>
      </div>

      {/* Métricas e Fatores de Avaliação */}
      {metrics && (
        <div className="c6-score-metrics-grid">
          <div className="c6-score-metric-box">
            <div className="metric-icon-wrap green">
              <CheckCircle2 size={14} />
            </div>
            <div className="metric-data">
              <span className="metric-val">{metrics.paidOnTimeCount}</span>
              <span className="metric-label">Pagas em Dia</span>
            </div>
          </div>

          <div className="c6-score-metric-box">
            <div className="metric-icon-wrap gold">
              <Award size={14} />
            </div>
            <div className="metric-data">
              <span className="metric-val">{metrics.fullyPaidContractsCount}</span>
              <span className="metric-label">Quitados 100%</span>
            </div>
          </div>

          <div className="c6-score-metric-box">
            <div className={`metric-icon-wrap ${metrics.totalDelaysCount > 0 ? 'red' : 'gray'}`}>
              <AlertCircle size={14} />
            </div>
            <div className="metric-data">
              <span className={`metric-val ${metrics.totalDelaysCount > 0 ? 'text-red' : ''}`}>
                {metrics.totalDelaysCount}
              </span>
              <span className="metric-label">Atrasos Totais</span>
            </div>
          </div>

          <div className="c6-score-metric-box">
            <div className={`metric-icon-wrap ${metrics.activeOverdueCount > 0 ? 'red' : 'gold'}`}>
              <TrendingUp size={14} />
            </div>
            <div className="metric-data">
              <span className="metric-val">{metrics.openContractsCount}</span>
              <span className="metric-label">Contratos Ativos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditScoreCard;

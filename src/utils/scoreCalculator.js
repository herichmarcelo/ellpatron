import { parseDateSafe } from './formatters';

/**
 * Motor de Cálculo de Score de Crédito (Credit Scoring) — Ell Patron
 * Pontuação dinâmica de 0 a 1000 pontos baseada em dados cadastrais e histórico de pagamentos/contratos.
 */

export const calculateCreditScore = (client = {}, contracts = [], payments = [], isBlacklisted = false) => {
  let score = 500; // Pontuação base para qualquer cliente cadastrado

  // Fatores de contagem
  let paidOnTimeCount = 0;
  let lightDelayCount = 0;
  let moderateDelayCount = 0;
  let severeDelayCount = 0;
  let fullyPaidContractsCount = 0;
  let openContractsCount = 0;
  let activeOverdueCount = 0;

  // 1. DADOS CADASTRAIS (Até +100 pontos)
  const cpfClean = (client?.cpf || '').replace(/\D/g, '');
  if (cpfClean.length === 11) {
    score += 40;
  }

  const phoneClean = (client?.phone || '').replace(/\D/g, '');
  if (phoneClean.length >= 10) {
    score += 30;
  }

  const hasAddress = client?.address?.street || client?.street || client?.address?.city || client?.city;
  if (hasAddress) {
    score += 30;
  }

  // Filtra os contratos do cliente (por CPF ou por ID/Nome)
  const clientContracts = contracts.filter(c => {
    if (client.cpf && c.client_cpf) {
      return c.client_cpf.replace(/\D/g, '') === cpfClean;
    }
    if (client.name && c.client_name) {
      return c.client_name.toLowerCase().trim() === client.name.toLowerCase().trim();
    }
    return false;
  });

  const now = new Date();

  // 2. HISTÓRICO DE CONTRATOS E PARCELAS
  clientContracts.forEach(contract => {
    const isPaidOff = contract.status === 'paid';
    if (isPaidOff) {
      fullyPaidContractsCount += 1;
      score += 60; // Bônus de fidelidade por contrato 100% quitado
    } else {
      openContractsCount += 1;
    }

    // Pagamentos deste contrato
    const contractPayments = payments.filter(p => 
      p.contract_id === contract.id || 
      (p.contract_protocol && p.contract_protocol === contract.protocol_number)
    );

    const totalInstallments = parseInt(contract.installments_count || contract.installments || 1, 10);
    const monthlyVal = Number(contract.monthly_installment || (contract.total_amount / totalInstallments));
    const baseDueDate = parseDateSafe(contract.due_date || contract.first_due_date || contract.loan_date) || now;

    // Analisa cada parcela do contrato
    for (let i = 1; i <= totalInstallments; i++) {
      const instDueDate = new Date(baseDueDate);
      instDueDate.setMonth(baseDueDate.getMonth() + (i - 1));
      instDueDate.setHours(23, 59, 59, 999);

      const instPayments = contractPayments.filter(p => parseInt(p.installment_number, 10) === i);
      const totalPaidInst = instPayments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      const isPaid = totalPaidInst >= monthlyVal - 0.05;

      if (isPaid) {
        // Verifica a data do último pagamento para saber se foi pago em dia
        const lastPayDate = instPayments.length > 0 
          ? parseDateSafe(instPayments[instPayments.length - 1].payment_date) || now 
          : now;

        if (lastPayDate <= instDueDate) {
          paidOnTimeCount += 1;
          score += 25; // Parcela paga em dia / adiantada
        } else {
          const diffMs = lastPayDate - instDueDate;
          const delayDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (delayDays <= 5) {
            lightDelayCount += 1;
            score -= 15;
          } else if (delayDays <= 15) {
            moderateDelayCount += 1;
            score -= 40;
          } else {
            severeDelayCount += 1;
            score -= 80;
          }
        }
      } else {
        // Parcela ainda não quitada: verifica se está atrasada hoje
        if (now > instDueDate) {
          const diffMs = now - instDueDate;
          const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (daysOverdue > 0) {
            activeOverdueCount += 1;
            if (daysOverdue <= 5) {
              lightDelayCount += 1;
              score -= 30;
            } else if (daysOverdue <= 15) {
              moderateDelayCount += 1;
              score -= 60;
            } else {
              severeDelayCount += 1;
              score -= 120;
            }
          }
        }
      }
    }
  });

  // 3. PENALIDADE MASSIVA POR BLOQUEIO / LISTA NEGRA
  if (isBlacklisted || client.is_blacklisted || client.status === 'blocked' || client.status === 'inadimplente') {
    score -= 500;
  }

  // 4. LIMITAÇÃO DA PONTUAÇÃO (0 a 1000)
  const finalScore = Math.min(Math.max(Math.round(score), 0), 1000);

  // 5. CLASSIFICAÇÃO DE FAIXA DE RISCO
  let tier = 'medium';
  let tierLabel = 'Risco Moderado';
  let color = '#EAB308'; // Dourado
  let badgeClass = 'score-badge--medium';
  let recommendation = 'Cliente aceitável. Recomenda-se acompanhar datas de vencimento.';

  if (finalScore >= 700) {
    tier = 'high';
    tierLabel = 'Baixo Risco';
    color = '#10B981'; // Verde
    badgeClass = 'score-badge--high';
    recommendation = 'Cliente excelente com ótimo histórico. Crédito facilitado com condições especiais.';
  } else if (finalScore < 400 || isBlacklisted) {
    tier = 'low';
    tierLabel = 'Alto Risco';
    color = '#EF4444'; // Vermelho
    badgeClass = 'score-badge--low';
    recommendation = isBlacklisted 
      ? 'Cliente bloqueado na Lista Negra. Bloqueio preventivo para novos contratos.' 
      : 'Histórico de atrasos recorrentes. Exige cautela e garantias adicionais antes de liberar crédito.';
  }

  return {
    score: finalScore,
    tier,
    tierLabel,
    color,
    badgeClass,
    recommendation,
    metrics: {
      paidOnTimeCount,
      fullyPaidContractsCount,
      openContractsCount,
      activeOverdueCount,
      totalDelaysCount: lightDelayCount + moderateDelayCount + severeDelayCount,
      isBlacklisted
    }
  };
};

import { parseDateSafe } from './formatters';

/**
 * Financial calculation utilities
 */

/**
 * Calculate daily interest rate from monthly rate
 * @param {number} monthlyRate - Monthly interest rate as percentage (e.g., 10 for 10%)
 * @returns {number} Daily interest rate as percentage
 */
export const calculateDailyRate = (monthlyRate) => {
  return ((1 + monthlyRate / 100) ** (1 / 30) - 1) * 100;
};

/**
 * Calculate monthly interest from principal
 * @param {number} principal - Loan amount
 * @param {number} monthlyRate - Monthly interest rate as percentage
 * @returns {number} Monthly interest amount
 */
export const calculateMonthlyInterest = (principal, monthlyRate) => {
  return principal * (monthlyRate / 100);
};

/**
 * Calculate daily interest for overdue payments
 * @param {number} principal - Loan amount
 * @param {number} dailyRate - Daily interest rate as percentage
 * @returns {number} Daily interest amount
 */
export const calculateDailyInterest = (principal, dailyRate) => {
  return principal * (dailyRate / 100);
};

/**
 * Calculate total overdue amount
 * @param {number} principal - Original loan amount
 * @param {number} monthlyRate - Monthly interest rate as percentage
 * @param {number} daysOverdue - Number of days overdue
 * @returns {object} Object with daily interest, total additional, and total due
 */
export const calculateOverdueAmount = (principal, monthlyRate, daysOverdue) => {
  const dailyRate = calculateDailyRate(monthlyRate);
  const dailyInterest = calculateDailyInterest(principal, dailyRate);
  const totalAdditional = dailyInterest * daysOverdue;
  const monthlyInterest = calculateMonthlyInterest(principal, monthlyRate);
  const totalDue = principal + monthlyInterest + totalAdditional;

  return {
    dailyRate,
    dailyInterest,
    totalAdditional,
    monthlyInterest,
    totalDue
  };
};

/**
 * Calculate installment amount
 * @param {number} principal - Loan amount
 * @param {number} monthlyRate - Monthly interest rate as percentage
 * @param {number} months - Number of months
 * @returns {number} Monthly installment amount
 */
export const calculateInstallment = (principal, monthlyRate, months) => {
  const monthlyRateDecimal = monthlyRate / 100;
  if (monthlyRateDecimal === 0) {
    return principal / months;
  }
  const installment = principal * (monthlyRateDecimal * (1 + monthlyRateDecimal) ** months) / 
                       ((1 + monthlyRateDecimal) ** months - 1);
  return installment;
};

/**
 * Calculate total payment over loan period
 * @param {number} installment - Monthly installment
 * @param {number} months - Number of months
 * @returns {number} Total payment amount
 */
export const calculateTotalPayment = (installment, months) => {
  return installment * months;
};

/**
 * Calculate total interest paid
 * @param {number} totalPayment - Total payment over loan period
 * @param {number} principal - Original loan amount
 * @returns {number} Total interest paid
 */
export const calculateTotalInterest = (totalPayment, principal) => {
  return totalPayment - principal;
};

/**
 * Calculate commission (typically 10% of interest)
 * @param {number} interest - Interest amount
 * @param {number} commissionRate - Commission rate as percentage (default 10%)
 * @returns {number} Commission amount
 */
export const calculateCommission = (interest, commissionRate = 10) => {
  return interest * (commissionRate / 100);
};

/**
 * Calculate net profit after commission
 * @param {number} interest - Interest amount
 * @param {number} commission - Commission amount
 * @returns {number} Net profit
 */
export const calculateNetProfit = (interest, commission) => {
  return interest - commission;
};

/**
 * Calculate payment schedule for a loan
 * @param {number} principal - Loan amount
 * @param {number} monthlyRate - Monthly interest rate as percentage
 * @param {number} months - Number of months
 * @param {Date} startDate - Start date of loan
 * @returns {Array} Array of payment objects
 */
export const calculatePaymentSchedule = (principal, monthlyRate, months, startDate) => {
  const installment = calculateInstallment(principal, monthlyRate, months);
  const schedule = [];
  let remainingBalance = principal;
  let currentDate = new Date(startDate);

  for (let i = 1; i <= months; i++) {
    const interestPayment = remainingBalance * (monthlyRate / 100);
    const principalPayment = installment - interestPayment;
    remainingBalance -= principalPayment;

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);

    schedule.push({
      installmentNumber: i,
      dueDate: new Date(currentDate),
      installmentAmount: installment,
      principalPayment: principalPayment,
      interestPayment: interestPayment,
      remainingBalance: Math.max(0, remainingBalance)
    });
  }

  return schedule;
};

/**
 * Calculate days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days between dates (absolute value)
 */
export const calculateDaysBetween = (date1, date2) => {
  const d1 = parseDateSafe(date1) || new Date(date1);
  const d2 = parseDateSafe(date2) || new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.round((d1 - d2) / oneDay));
};

/**
 * Check if a payment is overdue
 * @param {Date|string} dueDate - Payment due date
 * @returns {object} Object with isOverdue boolean and daysOverdue number
 */
export const checkOverdueStatus = (dueDate) => {
  if (!dueDate) return { isOverdue: false, daysOverdue: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseDateSafe(dueDate) || new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const isOverdue = today > due;
  const daysOverdue = isOverdue ? calculateDaysBetween(today, due) : 0;

  return {
    isOverdue,
    daysOverdue
  };
};

/**
 * Determina o status detalhado de um contrato ou parcela
 * @param {object} contract - Objeto do contrato ou parcela
 * @returns {object} { status: 'paid'|'overdue'|'open'|'cancelled', label: string, badgeClass: string, textClass: string, isOverdue: boolean, isPaid: boolean, daysOverdue: number }
 */
export const getContractStatus = (contract) => {
  if (!contract) {
    return { status: 'open', label: 'Em Dia', badgeClass: 'c6-status-pill--gold', textClass: 'text-gold', isOverdue: false, isPaid: false, daysOverdue: 0 };
  }

  // 1. Se a parcela já estiver paga -> 'Quitado' / 'Pago'
  if (contract.status === 'paid' || contract.paid === true) {
    return {
      status: 'paid',
      label: 'Quitado',
      badgeClass: 'c6-status-pill--green',
      textClass: 'text-green',
      isOverdue: false,
      isPaid: true,
      daysOverdue: 0
    };
  }

  // Se cancelado
  if (contract.status === 'cancelled') {
    return {
      status: 'cancelled',
      label: 'Cancelado',
      badgeClass: 'c6-status-pill--muted',
      textClass: 'text-muted',
      isOverdue: false,
      isPaid: false,
      daysOverdue: 0
    };
  }

  // 2. Data de hoje zerando as horas
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // 3. Data de vencimento zerando as horas
  const rawDueDate = contract.due_date || contract.data_vencimento || contract.dueDate;
  if (!rawDueDate) {
    return {
      status: 'open',
      label: 'Em Dia',
      badgeClass: 'c6-status-pill--gold',
      textClass: 'text-gold',
      isOverdue: false,
      isPaid: false,
      daysOverdue: 0
    };
  }

  const dataVencimento = parseDateSafe(rawDueDate) || new Date(rawDueDate);
  dataVencimento.setHours(0, 0, 0, 0);

  // 4. Se NÃO estiver paga E dataVencimento < hoje -> 'Atrasado'
  const isOverdue = dataVencimento < hoje;

  if (isOverdue) {
    const diffTime = hoje.getTime() - dataVencimento.getTime();
    const daysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    return {
      status: 'overdue',
      label: 'Atrasado',
      badgeClass: 'c6-status-pill--red',
      textClass: 'text-red',
      isOverdue: true,
      isPaid: false,
      daysOverdue
    };
  }

  // 5. Se NÃO estiver paga E dataVencimento >= hoje -> 'Em Dia' / 'Pendente'
  return {
    status: 'open',
    label: 'Em Dia',
    badgeClass: 'c6-status-pill--gold',
    textClass: 'text-gold',
    isOverdue: false,
    isPaid: false,
    daysOverdue: 0
  };
};

/**
 * Calculate financial summary for dashboard
 * @param {Array} loans - Array of loan objects
 * @returns {object} Financial summary object
 */
export const calculateFinancialSummary = (loans) => {
  let totalInvested = 0;
  let monthlyRevenue = 0;
  let returnedAmount = 0;
  let lostAmount = 0;
  let commissionsToPay = 0;

  loans.forEach(loan => {
    totalInvested += loan.principal;
    
    const monthlyInterest = calculateMonthlyInterest(loan.principal, loan.interestRate);
    monthlyRevenue += monthlyInterest;
    
    if (loan.status === 'paid') {
      returnedAmount += loan.principal + monthlyInterest;
    } else if (loan.status === 'lost') {
      lostAmount += loan.principal;
    }
    
    const commission = calculateCommission(monthlyInterest);
    commissionsToPay += commission;
  });

  return {
    totalInvested,
    monthlyRevenue,
    returnedAmount,
    lostAmount,
    commissionsToPay
  };
};

/**
 * Calculate contract values for loan generation
 * @param {number} principal - Loan principal amount
 * @param {number} interestRate - Monthly interest rate percentage
 * @returns {object} Object with calculated values
 */
export const calculateContractValues = (principal, interestRate) => {
  const interestAmount = principal * (interestRate / 100);
  const totalOriginal = principal + interestAmount;

  return {
    principal,
    interestRate,
    interestAmount,
    totalOriginal
  };
};

/**
 * Calculate overdue penalties for contract
 * @param {number} principal - Loan principal amount
 * @param {number} penaltyRate - Penalty rate percentage (one-time)
 * @param {number} dailyInterestRate - Daily interest rate percentage
 * @param {number} daysOverdue - Number of days overdue
 * @returns {object} Object with penalty calculations
 */
export const calculateOverduePenalties = (principal, penaltyRate, dailyInterestRate, daysOverdue) => {
  const p = Number(principal) || 0;
  const pRate = Number(penaltyRate) || 0;
  const dRate = Number(dailyInterestRate) || 0;
  const days = Number(daysOverdue) || 0;

  const penaltyAmount = p * (pRate / 100);
  const dailyInterestAmount = p * (dRate / 100);
  const totalDailyInterest = dailyInterestAmount * days;
  const totalPenalties = penaltyAmount + totalDailyInterest;

  return {
    penaltyAmount,
    multaValor: penaltyAmount,
    dailyInterestAmount,
    totalDailyInterest,
    jurosDiariosValor: totalDailyInterest,
    totalPenalties,
    daysOverdue: days
  };
};

/**
 * Calculate total updated amount with penalties
 * @param {number} totalOriginal - Original total to pay
 * @param {number} totalPenalties - Total penalties amount or penalty value
 * @param {number} [jurosDiarios] - Optional daily interest value
 * @returns {object} Object with updated total
 */
export const calculateUpdatedTotal = (totalOriginal, totalPenalties, jurosDiarios) => {
  const orig = Number(totalOriginal) || 0;
  let penalties = 0;
  
  if (jurosDiarios !== undefined) {
    penalties = (Number(totalPenalties) || 0) + (Number(jurosDiarios) || 0);
  } else {
    penalties = Number(totalPenalties) || 0;
  }

  const totalUpdated = orig + penalties;

  return {
    totalOriginal: orig,
    totalPenalties: penalties,
    totalUpdated
  };
};

/**
 * Generate contract protocol number
 * @returns {string} Protocol number
 */
export const generateContractProtocol = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CTR-${year}${month}-${random}`;
};

export default {
  calculateDailyRate,
  calculateMonthlyInterest,
  calculateDailyInterest,
  calculateOverdueAmount,
  calculateInstallment,
  calculateTotalPayment,
  calculateTotalInterest,
  calculateCommission,
  calculateNetProfit,
  calculatePaymentSchedule,
  calculateDaysBetween,
  checkOverdueStatus,
  calculateFinancialSummary,
  calculateContractValues,
  calculateOverduePenalties,
  calculateUpdatedTotal,
  getContractStatus,
  generateContractProtocol
};
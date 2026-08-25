import { useEffect } from 'react';
import { checkAndUpdateLoanStatus } from '../supabase/services';

/**
 * Hook to automatically update loan status based on due dates
 */
export const useLoanStatusUpdater = (loanId, refreshInterval = 24 * 60 * 60 * 1000) => {
  useEffect(() => {
    if (!loanId) return;

    const updateStatus = async () => {
      await checkAndUpdateLoanStatus(loanId);
    };

    // Initial check
    updateStatus();

    // Set up periodic checks
    const interval = setInterval(updateStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [loanId, refreshInterval]);
};

/**
 * Calculate compound interest for overdue payments
 */
export const calculateCompoundInterest = (principal, monthlyRate, daysOverdue) => {
  const dailyRate = ((1 + monthlyRate / 100) ** (1 / 30) - 1);
  const compoundAmount = principal * ((1 + dailyRate) ** daysOverdue);
  return compoundAmount - principal;
};

/**
 * Calculate total amount due with compound interest
 */
export const calculateTotalDueWithCompound = (principal, monthlyRate, daysOverdue) => {
  const compoundInterest = calculateCompoundInterest(principal, monthlyRate, daysOverdue);
  const monthlyInterest = principal * (monthlyRate / 100);
  return principal + monthlyInterest + compoundInterest;
};

/**
 * Determine if client should be moved to blacklist
 */
export const shouldMoveToBlacklist = (daysOverdue, amountOverdue, blacklistThresholdDays = 60, blacklistThresholdAmount = 1000) => {
  return daysOverdue >= blacklistThresholdDays || amountOverdue >= blacklistThresholdAmount;
};


/**
 * Generate payment reminder schedule
 */
export const generatePaymentReminders = (dueDate, reminderDays = [3, 1]) => {
  const reminders = [];
  const due = new Date(dueDate);
  
  reminderDays.forEach(daysBefore => {
    const reminderDate = new Date(due);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminders.push({
      date: reminderDate,
      type: 'reminder',
      daysBefore,
      message: `Pagamento vence em ${daysBefore} dia${daysBefore > 1 ? 's' : ''}`
    });
  });
  
  // Add overdue reminder
  const overdueDate = new Date(due);
  overdueDate.setDate(overdueDate.getDate() + 1);
  reminders.push({
    date: overdueDate,
    type: 'overdue',
    daysBefore: -1,
    message: 'Pagamento está em atraso'
  });
  
  return reminders.sort((a, b) => a.date - b.date);
};

/**
 * Calculate payment status based on current date
 */
export const getPaymentStatus = (dueDate, paidDate = null) => {
  if (paidDate) {
    const paid = new Date(paidDate);
    const due = new Date(dueDate);
    
    if (paid <= due) {
      return 'on_time';
    } else {
      return 'late';
    }
  }
  
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays <= 3) {
    return 'urgent';
  } else if (diffDays <= 7) {
    return 'upcoming';
  } else {
    return 'scheduled';
  }
};

/**
 * Calculate loan health score (0-100)
 */
export const calculateLoanHealthScore = (loan) => {
  let score = 100;
  
  const totalInstallments = loan.installments.length;
  const paidInstallments = loan.installments.filter(i => i.paid).length;
  const overdueInstallments = loan.installments.filter(i => {
    if (i.paid) return false;
    const dueDate = new Date(i.dueDate);
    const today = new Date();
    return dueDate < today;
  }).length;
  
  // Deduct points for overdue installments
  score -= (overdueInstallments * 15);
  
  // Deduct points for low payment rate
  const paymentRate = paidInstallments / totalInstallments;
  if (paymentRate < 0.5) {
    score -= 20;
  } else if (paymentRate < 0.75) {
    score -= 10;
  }
  
  // Deduct points for long overdue periods
  loan.installments.forEach(installment => {
    if (!installment.paid) {
      const dueDate = new Date(installment.dueDate);
      const today = new Date();
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue > 30) {
        score -= 5;
      }
      if (daysOverdue > 60) {
        score -= 10;
      }
    }
  });
  
  return Math.max(0, score);
};

/**
 * Get loan status color based on health score
 */
export const getLoanStatusColor = (score) => {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  if (score >= 40) return 'var(--gold-primary)';
  return 'var(--danger)';
};

/**
 * Auto-generate protocol number
 */
export const generateProtocolNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PN-${year}-${month}-${random}`;
};

export default {
  useLoanStatusUpdater,
  calculateCompoundInterest,
  calculateTotalDueWithCompound,
  shouldMoveToBlacklist,
  generatePaymentReminders,
  getPaymentStatus,
  calculateLoanHealthScore,
  getLoanStatusColor,
  generateProtocolNumber
};

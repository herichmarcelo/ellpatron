import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateFinancialSummary, calculateOverdueAmount, checkOverdueStatus } from '../utils/calculations';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getLoans, createLoan as createLoanApi, updateLoan as updateLoanApi, markInstallmentPaid as markInstallmentPaidApi } from '../supabase/services.js';

// Query keys
export const loanKeys = {
  all: ['loans'],
};

// Fetch loans
export const useLoans = () => {
  const { data: loans = [], isLoading, error } = useQuery({
    queryKey: loanKeys.all,
    queryFn: async () => {
      const result = await getLoans();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  const summary = loans.length > 0 ? calculateFinancialSummary(loans) : null;

  const getLoansByStatus = (status) => {
    return loans.filter(loan => loan.status === status);
  };

  const getOverdueLoans = () => {
    return loans.filter(loan => {
      return loan.installments.some(installment => {
        const { isOverdue } = checkOverdueStatus(new Date(installment.dueDate));
        return isOverdue && !installment.paid;
      });
    });
  };

  const getDueToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return loans.filter(loan => {
      return loan.installments.some(installment => {
        const dueDate = new Date(installment.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime() && !installment.paid;
      });
    });
  };

  const getLoanById = (id) => {
    return loans.find(loan => loan.id === id);
  };

  const getLoansByClient = (clientId) => {
    return loans.filter(loan => loan.clientId === clientId);
  };

  const calculateLoanOverdue = (loan) => {
    const unpaidInstallments = loan.installments.filter(inst => !inst.paid);
    const overdueDetails = unpaidInstallments.map(installment => {
      const { isOverdue, daysOverdue } = checkOverdueStatus(new Date(installment.dueDate));
      if (isOverdue) {
        const overdueCalc = calculateOverdueAmount(
          loan.principal,
          loan.interestRate,
          daysOverdue
        );
        return {
          ...installment,
          daysOverdue,
          ...overdueCalc
        };
      }
      return null;
    }).filter(Boolean);

    return overdueDetails;
  };

  const getFormattedSummary = () => {
    if (!summary) return null;
    return {
      totalInvested: formatCurrency(summary.totalInvested),
      monthlyRevenue: formatCurrency(summary.monthlyRevenue),
      returnedAmount: formatCurrency(summary.returnedAmount),
      lostAmount: formatCurrency(summary.lostAmount),
      commissionsToPay: formatCurrency(summary.commissionsToPay)
    };
  };

  return {
    loans,
    summary,
    loading,
    error,
    getLoansByStatus,
    getOverdueLoans,
    getDueToday,
    getLoanById,
    getLoansByClient,
    calculateLoanOverdue,
    getFormattedSummary
  };
};

// Mutation hooks
export const useAddLoan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (loanData) => {
      const result = await createLoanApi(loanData);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
};

export const useUpdateLoan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await updateLoanApi(id, data);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
};

export const useMarkInstallmentPaid = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ loanId, installmentNumber }) => {
      const result = await markInstallmentPaidApi(loanId, installmentNumber);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
};

export default useLoans;
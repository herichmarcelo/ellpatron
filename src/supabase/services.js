import supabase from './config';
import { checkOverdueStatus } from '../utils/calculations';

// Clients
export const createClient = async (clientData) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...clientData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getClient = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Cliente não encontrado' };

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getClients = async (filters = {}) => {
  try {
    let query = supabase.from('clients').select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.orderBy) {
      query = query.order(filters.orderBy, { ascending: filters.orderDirection !== 'desc' });
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateClient = async (clientId, data) => {
  try {
    const { error } = await supabase
      .from('clients')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteClient = async (clientId) => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Loans
export const createLoan = async (loanData) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .insert({
        ...loanData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getLoan = async (loanId) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Empréstimo não encontrado' };

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getLoans = async (filters = {}) => {
  try {
    let query = supabase.from('loans').select('*');

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.orderBy) {
      query = query.order(filters.orderBy, { ascending: filters.orderDirection !== 'desc' });
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateLoan = async (loanId, data) => {
  try {
    const { error } = await supabase
      .from('loans')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateLoanInstallment = async (loanId, installmentNumber, paymentData) => {
  try {
    const loanResult = await getLoan(loanId);
    if (!loanResult.success) return loanResult;

    const loan = loanResult.data;
    const updatedInstallments = loan.installments.map((inst) => {
      if (inst.number === installmentNumber) {
        return { ...inst, ...paymentData };
      }
      return inst;
    });

    // Check if all installments are paid
    const allPaid = updatedInstallments.every(inst => inst.paid);
    const status = allPaid ? 'paid' : loan.status;

    await updateLoan(loanId, { installments: updatedInstallments, status });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const markInstallmentPaid = async (loanId, installmentNumber, paymentData = {}) => {
  try {
    const loanResult = await getLoan(loanId);
    if (!loanResult.success) return loanResult;

    const loan = loanResult.data;
    const updatedInstallments = loan.installments.map((inst) => {
      if (inst.number === installmentNumber) {
        return { 
          ...inst, 
          paid: true, 
          paidAt: new Date().toISOString(),
          ...paymentData 
        };
      }
      return inst;
    });

    // Check if all installments are paid
    const allPaid = updatedInstallments.every(inst => inst.paid);
    const status = allPaid ? 'paid' : loan.status;

    await updateLoan(loanId, { installments: updatedInstallments, status });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Blacklist
export const addToBlacklist = async (blacklistData) => {
  try {
    const { data, error } = await supabase
      .from('blacklist')
      .insert({
        ...blacklistData,
        added_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update client status
    await updateClient(blacklistData.clientId, { status: 'blacklisted' });

    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getBlacklist = async () => {
  try {
    const { data, error } = await supabase
      .from('blacklist')
      .select('*');

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const removeFromBlacklist = async (blacklistId, clientId) => {
  try {
    const { error } = await supabase
      .from('blacklist')
      .delete()
      .eq('id', blacklistId);

    if (error) throw error;

    // Update client status
    await updateClient(clientId, { status: 'active' });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};


// Transactions
export const createTransaction = async (transactionData) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transactionData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getTransactions = async (filters = {}) => {
  try {
    let query = supabase.from('transactions').select('*');

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.loanId) {
      query = query.eq('loan_id', filters.loanId);
    }

    if (filters.startDate && filters.endDate) {
      query = query.gte('created_at', filters.startDate).lte('created_at', filters.endDate);
    }

    if (filters.orderBy) {
      query = query.order(filters.orderBy, { ascending: filters.orderDirection !== 'desc' });
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Business Rules: Auto-update loan status
export const checkAndUpdateLoanStatus = async (loanId) => {
  try {
    const loanResult = await getLoan(loanId);
    if (!loanResult.success) return loanResult;

    const loan = loanResult.data;
    let newStatus = loan.status;

    // Check if any installment is overdue
    let hasOverdue = false;
    let daysOverdue = 0;

    for (const installment of loan.installments) {
      if (!installment.paid) {
        const dueDate = new Date(installment.dueDate);
        const overdueCheck = checkOverdueStatus(dueDate);

        if (overdueCheck.isOverdue) {
          hasOverdue = true;
          daysOverdue = Math.max(daysOverdue, overdueCheck.daysOverdue);
        }
      }
    }

    // Update status based on overdue days
    if (hasOverdue) {
      if (daysOverdue >= 30) {
        newStatus = 'critical';
      } else {
        newStatus = 'overdue';
      }
    }

    // Auto-move to blacklist if overdue for more than 60 days
    if (daysOverdue >= 60 && loan.status !== 'blacklisted') {
      const clientResult = await getClient(loan.client_id);
      if (clientResult.success) {
        await addToBlacklist({
          client_id: loan.client_id,
          loan_id: loanId,
          protocol_number: loan.protocol_number,
          principal: loan.principal,
          interest_rate: loan.interest_rate,
          days_overdue: daysOverdue,
          reason: 'Pagamento em atraso por mais de 60 dias'
        });
        newStatus = 'blacklisted';
      }
    }

    if (newStatus !== loan.status) {
      await updateLoan(loanId, { status: newStatus, days_overdue: daysOverdue });
    }

    return { success: true, status: newStatus, daysOverdue };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Real-time listeners
export const subscribeToClients = (callback, filters = {}) => {
  let query = supabase.from('clients').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const subscription = query.on('changes', (payload) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
      getClients(filters).then(result => {
        if (result.success) callback(result.data);
      });
    }
  }).subscribe();

  return () => subscription.unsubscribe();
};

export const subscribeToLoans = (callback, filters = {}) => {
  let query = supabase.from('loans').select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const subscription = query.on('changes', (payload) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
      getLoans(filters).then(result => {
        if (result.success) callback(result.data);
      });
    }
  }).subscribe();

  return () => subscription.unsubscribe();
};

export default {
  // Clients
  createClient,
  getClient,
  getClients,
  updateClient,
  deleteClient,

  // Loans
  createLoan,
  getLoan,
  getLoans,
  updateLoan,
  updateLoanInstallment,
  markInstallmentPaid,

  // Blacklist
  addToBlacklist,
  getBlacklist,
  removeFromBlacklist,


  // Transactions
  createTransaction,
  getTransactions,

  // Business Rules
  checkAndUpdateLoanStatus,

  // Real-time
  subscribeToClients,
  subscribeToLoans
};

// Contracts
export const createContract = async (contractData) => {
  try {
    const payload = {
      protocol_number: contractData.protocol_number || contractData.protocolNumber,
      client_name: contractData.client_name || contractData.clientName,
      client_cpf: contractData.client_cpf || contractData.clientCpf,
      loan_date: contractData.loan_date || contractData.loanDate || new Date().toISOString(),
      principal: Number(contractData.principal) || 0,
      due_date: contractData.due_date || contractData.dueDate,
      installments: Number(contractData.installments || contractData.installments_count || contractData.installmentsCount) || 1,
      interest_rate_year: Number(contractData.interest_rate_year || contractData.interestRateYear) || 0,
      interest_rate_month: Number(contractData.interest_rate_month || contractData.interestRateMonth || contractData.interestRate) || 0,
      penalty_rate: Number(contractData.penalty_rate || contractData.late_fee_percentage || contractData.penaltyRate) || 0,
      daily_interest_rate: Number(contractData.daily_interest_rate || contractData.daily_late_interest_percentage || contractData.dailyInterestRate) || 0,
      interest_amount: Number(contractData.interest_amount || contractData.totalInterest || 0),
      monthly_installment: Number(contractData.monthly_installment || contractData.monthlyInstallment) || 0,
      total_original: Number(contractData.total_original || contractData.total_amount || contractData.totalOriginal || contractData.totalAmount) || 0,
      status: contractData.status || 'open'
    };

    const { data, error } = await supabase
      .from('contracts')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating contract:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id, data };
  } catch (error) {
    console.error('Error creating contract:', error);
    return { success: false, error: error.message };
  }
};

export const getContract = async (contractId) => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Contrato não encontrado' };

    const normalized = {
      ...data,
      total_amount: data.total_original || data.total_amount || data.principal,
      total_original: data.total_original || data.total_amount || data.principal,
      installments_count: data.installments || data.installments_count || 1,
      installments: data.installments || data.installments_count || 1,
      late_fee_percentage: data.penalty_rate || data.late_fee_percentage || 0,
      penalty_rate: data.penalty_rate || data.late_fee_percentage || 0,
      daily_late_interest_percentage: data.daily_interest_rate || data.daily_late_interest_percentage || 0,
      daily_interest_rate: data.daily_interest_rate || data.daily_late_interest_percentage || 0
    };

    return { success: true, data: normalized };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getContracts = async (filters = {}) => {
  try {
    let query = supabase.from('contracts').select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters.orderBy) {
      query = query.order(filters.orderBy, { ascending: filters.orderDirection !== 'desc' });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting contracts:', error);
      return { success: false, error: error.message };
    }

    const normalized = (data || []).map(c => ({
      ...c,
      total_amount: c.total_original || c.total_amount || c.principal,
      total_original: c.total_original || c.total_amount || c.principal,
      installments_count: c.installments || c.installments_count || 1,
      installments: c.installments || c.installments_count || 1,
      late_fee_percentage: c.penalty_rate || c.late_fee_percentage || 0,
      penalty_rate: c.penalty_rate || c.late_fee_percentage || 0,
      daily_late_interest_percentage: c.daily_interest_rate || c.daily_late_interest_percentage || 0,
      daily_interest_rate: c.daily_interest_rate || c.daily_late_interest_percentage || 0
    }));

    return { success: true, data: normalized };
  } catch (error) {
    console.error('Error getting contracts:', error);
    return { success: false, error: error.message };
  }
};

export const updateContract = async (contractId, data) => {
  try {
    const { error } = await supabase
      .from('contracts')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteContract = async (contractId) => {
  try {
    // 1. Limpa pagamentos vinculados ao contrato
    await supabase
      .from('payments')
      .delete()
      .eq('contract_id', contractId);

    // 2. Remove o contrato
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Payments
export const createPayment = async (paymentData) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        ...paymentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'paid'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false, error: error.message };
  }
};

export const getPayment = async (paymentId) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Pagamento não encontrado' };

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getPayments = async (filters = {}) => {
  try {
    let query = supabase.from('payments').select('*');

    if (filters.contractId) {
      query = query.eq('contract_id', filters.contractId);
    }

    if (filters.contractProtocol) {
      query = query.eq('contract_protocol', filters.contractProtocol);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.orderBy) {
      query = query.order(filters.orderBy, { ascending: filters.orderDirection !== 'desc' });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting payments:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting payments:', error);
    return { success: false, error: error.message };
  }
};

export const updatePayment = async (paymentId, data) => {
  try {
    const { error } = await supabase
      .from('payments')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deletePayment = async (paymentId) => {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ==========================================================
// SAVINGS & DEPOSITS WALLET (Carteira e Poupança de Clientes)
// ==========================================================

const LOCAL_SAVINGS_KEY = 'ellpatron_savings_transactions_fallback';

const getLocalSavings = () => {
  try {
    const data = localStorage.getItem(LOCAL_SAVINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalSavings = (list) => {
  try {
    localStorage.setItem(LOCAL_SAVINGS_KEY, JSON.stringify(list));
  } catch (e) {}
};

export const createSavingsTransaction = async (transactionData) => {
  try {
    const payload = {
      client_id: transactionData.client_id || transactionData.clientId,
      type: transactionData.type || 'deposit', // 'deposit', 'withdrawal', 'interest', 'adjustment'
      amount: parseFloat(transactionData.amount) || 0,
      interest_rate_month: parseFloat(transactionData.interest_rate_month || transactionData.interestRateMonth || 0),
      transaction_date: transactionData.transaction_date || transactionData.transactionDate || new Date().toISOString().split('T')[0],
      payment_method: transactionData.payment_method || transactionData.paymentMethod || 'pix',
      notes: transactionData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('savings_transactions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('Supabase savings_transactions not accessible, using local fallback:', error.message);
      const fallbackItem = {
        ...payload,
        id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      };
      const list = getLocalSavings();
      list.push(fallbackItem);
      saveLocalSavings(list);
      return { success: true, data: fallbackItem, id: fallbackItem.id, fallback: true };
    }

    return { success: true, data, id: data.id };
  } catch (error) {
    console.error('Error creating savings transaction:', error);
    // Local fallback
    const payload = {
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      client_id: transactionData.client_id || transactionData.clientId,
      type: transactionData.type || 'deposit',
      amount: parseFloat(transactionData.amount) || 0,
      interest_rate_month: parseFloat(transactionData.interest_rate_month || 0),
      transaction_date: transactionData.transaction_date || new Date().toISOString().split('T')[0],
      payment_method: transactionData.payment_method || 'pix',
      notes: transactionData.notes || '',
      created_at: new Date().toISOString()
    };
    const list = getLocalSavings();
    list.push(payload);
    saveLocalSavings(list);
    return { success: true, data: payload, id: payload.id, fallback: true };
  }
};

export const getSavingsTransactions = async (filters = {}) => {
  try {
    let query = supabase.from('savings_transactions').select('*');

    if (filters.clientId || filters.client_id) {
      query = query.eq('client_id', filters.clientId || filters.client_id);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    query = query.order('transaction_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase savings query fallback:', error.message);
      let localList = getLocalSavings();
      if (filters.clientId || filters.client_id) {
        const cId = filters.clientId || filters.client_id;
        localList = localList.filter(t => t.client_id === cId);
      }
      if (filters.type) {
        localList = localList.filter(t => t.type === filters.type);
      }
      localList.sort((a, b) => new Date(b.transaction_date || b.created_at) - new Date(a.transaction_date || a.created_at));
      return { success: true, data: localList, fallback: true };
    }

    // Merge any local items with supabase items seamlessly
    const localItems = getLocalSavings().filter(l => 
      (!filters.clientId && !filters.client_id) || l.client_id === (filters.clientId || filters.client_id)
    );
    const combined = [...(data || [])];
    localItems.forEach(item => {
      if (!combined.some(c => c.id === item.id)) {
        combined.push(item);
      }
    });

    combined.sort((a, b) => new Date(b.transaction_date || b.created_at) - new Date(a.transaction_date || a.created_at));

    return { success: true, data: combined };
  } catch (error) {
    console.error('Error getting savings transactions:', error);
    let localList = getLocalSavings();
    if (filters.clientId || filters.client_id) {
      const cId = filters.clientId || filters.client_id;
      localList = localList.filter(t => t.client_id === cId);
    }
    return { success: true, data: localList, fallback: true };
  }
};

export const deleteSavingsTransaction = async (transactionId) => {
  try {
    if (String(transactionId).startsWith('local_')) {
      const list = getLocalSavings().filter(t => t.id !== transactionId);
      saveLocalSavings(list);
      return { success: true };
    }

    const { error } = await supabase
      .from('savings_transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      // Also check local
      const list = getLocalSavings().filter(t => t.id !== transactionId);
      saveLocalSavings(list);
      return { success: true };
    }

    return { success: true };
  } catch (error) {
    const list = getLocalSavings().filter(t => t.id !== transactionId);
    saveLocalSavings(list);
    return { success: true };
  }
};

export const getClientSavingsSummary = async (clientId) => {
  try {
    const result = await getSavingsTransactions({ clientId });
    const transactions = result.success ? (result.data || []) : [];

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalInterest = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit') totalDeposits += amt;
      else if (t.type === 'withdrawal') totalWithdrawals += amt;
      else if (t.type === 'interest') totalInterest += amt;
      else if (t.type === 'adjustment') {
        if (amt >= 0) totalDeposits += amt;
        else totalWithdrawals += Math.abs(amt);
      }
    });

    const currentBalance = Math.max(0, (totalDeposits + totalInterest) - totalWithdrawals);

    return {
      success: true,
      data: {
        currentBalance,
        totalDeposits,
        totalWithdrawals,
        totalInterest,
        transactionCount: transactions.length,
        transactions
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: { currentBalance: 0, totalDeposits: 0, totalWithdrawals: 0, totalInterest: 0, transactions: [] }
    };
  }
};


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
    const today = new Date();
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
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        ...contractData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contract:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
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

    return { success: true, data };
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
    return { success: true, data: data || [] };
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

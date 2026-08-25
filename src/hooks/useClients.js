import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatPhone, formatDate, stringToColor } from '../utils/formatters';
import { getClients, getBlacklist, createClient, updateClient as updateClientApi, deleteClient as deleteClientApi } from '../supabase/services';

// Query keys
export const clientKeys = {
  all: ['clients'],
  blacklist: ['blacklist'],
};

// Fetch clients
export const useClients = () => {
  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: clientKeys.all,
    queryFn: async () => {
      const result = await getClients();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  const { data: blacklist = [], isLoading: blacklistLoading, error: blacklistError } = useQuery({
    queryKey: clientKeys.blacklist,
    queryFn: async () => {
      const result = await getBlacklist();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  const loading = clientsLoading || blacklistLoading;
  const error = clientsError || blacklistError;

  const getClientsByStatus = (status) => {
    return clients.filter(client => client.status === status);
  };

  const getClientById = (id) => {
    return clients.find(client => client.id === id);
  };

  const searchClients = (query) => {
    const lowerQuery = query.toLowerCase();
    return clients.filter(client => 
      client.name.toLowerCase().includes(lowerQuery) ||
      client.phone.includes(query) ||
      client.cpf.includes(query)
    );
  };

  const getFormattedClients = () => {
    return clients.map(client => ({
      ...client,
      formattedPhone: formatPhone(client.phone),
      formattedDate: formatDate(client.registrationDate),
      avatarColor: stringToColor(client.name)
    }));
  };

  const getClientStats = () => {
    return {
      total: clients.length,
      active: clients.filter(c => c.status === 'active').length,
      inactive: clients.filter(c => c.status === 'inactive').length,
      blacklisted: blacklist.length
    };
  };

  const getRecentClients = (days = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return clients.filter(client => {
      const regDate = new Date(client.registrationDate);
      return regDate >= cutoffDate;
    });
  };

  return {
    clients,
    blacklist,
    loading,
    error,
    getClientsByStatus,
    getClientById,
    searchClients,
    getFormattedClients,
    getClientStats,
    getRecentClients
  };
};

// Mutation hooks
export const useAddClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientData) => {
      const result = await createClient(clientData);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await updateClientApi(id, data);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const result = await deleteClientApi(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
};

export const useAddToBlacklist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason }) => {
      // This would need a backend endpoint - for now we'll update the client status
      const result = await updateClientApi(clientId, { status: 'blacklisted' });
      if (!result.success) throw new Error(result.error);
      return { clientId, reason };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: clientKeys.blacklist });
    },
  });
};

export const useRemoveFromBlacklist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (blacklistId) => {
      // This would need a backend endpoint to delete from blacklist table
      // For now we just invalidate queries
      return blacklistId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: clientKeys.blacklist });
    },
  });
};

export const isClientBlacklisted = (clientId, blacklist) => {
  return blacklist.some(entry => entry.clientId === clientId);
};

export default useClients;
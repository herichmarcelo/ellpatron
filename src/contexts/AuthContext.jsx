import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../supabase/config.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (data) setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Não impede o loading de continuar mesmo se o profile falhar
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (error) {
      let errorMessage = 'Erro ao fazer login';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado';
      } else {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email, password, userData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Create user profile in database
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            name: userData.name || '',
            phone: userData.phone || '',
            role: userData.role || 'user',
            created_at: new Date().toISOString(),
            ...userData
          });

        if (profileError) throw profileError;
      }
      
      return { success: true, user: data.user };
    } catch (error) {
      let errorMessage = 'Erro ao criar conta';
      
      if (error.message.includes('User already registered')) {
        errorMessage = 'Email já cadastrado';
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = 'Senha muito fraca. Mínimo 6 caracteres';
      } else {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUserProfile(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      let errorMessage = 'Erro ao enviar email de recuperação';
      
      if (error.message.includes('User not found')) {
        errorMessage = 'Usuário não encontrado';
      } else {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const updateUserProfile = async (data) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };
    
    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUserProfile({ ...userProfile, ...data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const isAdmin = () => {
    return userProfile?.is_admin === true || userProfile?.role === 'admin';
  };

  const value = {
    user,
    userProfile,
    loading,
    isAdmin,
    login,
    register,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

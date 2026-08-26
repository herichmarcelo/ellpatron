-- ==========================================================
-- ELL PATRON / EASYACCOUNT - DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- ==========================================================
-- Execute este script no SQL Editor do seu projeto Supabase.

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Função auxiliar para atualização automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- 3. Tabela: USERS (Perfis complementares de usuários autenticados)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user', -- 'admin' ou 'user'
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 4. Tabela: CLIENTS (Clientes cadastrados no sistema)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    cpf VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(50),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5. Tabela: CONTRACTS (Contratos de mútuo e empréstimo)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_number VARCHAR(100) NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_cpf VARCHAR(20) NOT NULL,
    loan_date DATE NOT NULL,
    due_date DATE NOT NULL,
    principal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    installments_count INTEGER NOT NULL DEFAULT 1,
    interest_rate_year NUMERIC(8, 4) DEFAULT 15.0000,
    interest_rate_month NUMERIC(8, 4) DEFAULT 1.2500,
    late_fee_percentage NUMERIC(8, 4) DEFAULT 10.0000,
    daily_late_interest_percentage NUMERIC(8, 4) DEFAULT 1.0000,
    monthly_installment NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 6. Tabela: LOANS (Empréstimos legados / parcelamento estruturado em JSON)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    protocol_number VARCHAR(100),
    principal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    interest_rate NUMERIC(8, 4) NOT NULL DEFAULT 0.00,
    months INTEGER NOT NULL DEFAULT 1,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'critical', 'paid', 'blacklisted')),
    installments JSONB DEFAULT '[]'::jsonb,
    days_overdue INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 7. Tabela: PAYMENTS (Pagamentos e amortizações registrados)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    contract_protocol VARCHAR(100),
    installment_number INTEGER DEFAULT 1,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'pix' CHECK (payment_method IN ('pix', 'dinheiro', 'transferencia', 'boleto', 'cartao', 'outro')),
    status VARCHAR(50) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 8. Tabela: BLACKLIST (Lista Negra / Inadimplência Crítica)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name VARCHAR(255),
    client_cpf VARCHAR(20),
    client_phone VARCHAR(50),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    protocol_number VARCHAR(100),
    principal NUMERIC(15, 2) DEFAULT 0.00,
    total_debt NUMERIC(15, 2) DEFAULT 0.00,
    days_overdue INTEGER DEFAULT 0,
    reason TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 9. Tabela: TRANSACTIONS (Transações de fluxo de caixa e movimentações)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'investment', 'return')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    category VARCHAR(100),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 10. Tabela: SAVINGS_TRANSACTIONS (Carteira de Depósitos, Saques e Poupança de Clientes)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'interest', 'adjustment')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    interest_rate_month NUMERIC(8, 4) DEFAULT 0.0000,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) DEFAULT 'pix' CHECK (payment_method IN ('pix', 'dinheiro', 'transferencia', 'ted_doc', 'outro')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 11. Triggers de Atualização de updated_at
-- ----------------------------------------------------------
DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_clients_updated_at ON public.clients;
CREATE TRIGGER tr_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_contracts_updated_at ON public.contracts;
CREATE TRIGGER tr_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_loans_updated_at ON public.loans;
CREATE TRIGGER tr_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_payments_updated_at ON public.payments;
CREATE TRIGGER tr_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_savings_transactions_updated_at ON public.savings_transactions;
CREATE TRIGGER tr_savings_transactions_updated_at BEFORE UPDATE ON public.savings_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------
-- 12. Índices de Otimização de Busca
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON public.clients(cpf);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_contracts_client_cpf ON public.contracts(client_cpf);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_protocol ON public.contracts(protocol_number);
CREATE INDEX IF NOT EXISTS idx_contracts_due_date ON public.contracts(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_blacklist_client_id ON public.blacklist(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_savings_client_id ON public.savings_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_savings_date ON public.savings_transactions(transaction_date);

-- ----------------------------------------------------------
-- 13. Habilitação de Row Level Security (RLS)
-- ----------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para usuários autenticados (Full Access ao tenant/usuários autenticados)
CREATE POLICY "Permitir acesso completo a usuários autenticados em users" 
ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso completo a usuários autenticados em clients" 
ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso completo a usuários autenticados em contracts" 
ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso completo a usuários autenticados em loans" 
ON public.loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso completo a usuários autenticados em payments" 
ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso completo a usuários autenticados em blacklist" 
ON public.blacklist FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso completo a usuários autenticados em transactions" 
ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso completo a usuários autenticados em savings_transactions" 
ON public.savings_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

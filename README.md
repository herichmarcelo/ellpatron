# Ell Patron - Sistema de Gestão Financeira & Contratos de Crédito

Sistema de alta performance para administração de empréstimos, geração e emissão de contratos com cálculos automáticos de juros compostos, gestão de recebimentos e monitoramento de inadimplência com tema *Dark Luxury*.

---

## 🌟 Funcionalidades Principais

### 1. Gestão e Emissão de Contratos
- **Cálculo de Juros Compostos**: Cálculo automático de juros anuais (ex: 15% a.a.) e mensais (ex: 1.25% a.m.), com cálculo diário de atraso (ex: 1% a.d.) e multa contratual (ex: 10%).
- **Protocolo Automático**: Geração de números de protocolo padronizados (`PN-YYYY-MM-XXXX`).
- **Exportação & Impressão**: Geração instantânea de PDF formal com cláusulas contratuais de Confissão de Dívida, tabela de amortização e campos para assinatura.
- **Histórico Completo**: Visualização detalhada de contratos emitidos, filtros por status (*Em aberto, Pago, Em atraso, Cancelado*) e busca por cliente/CPF.

### 2. Gestão de Clientes & Relacionamento
- **Cadastro Completo**: Validação rigorosa de CPF brasileiro, formato de telefone com DDD e endereço.
- **Cobrança Rápida via WhatsApp**: Abertura direta do WhatsApp com mensagem de cobrança personalizada contendo o protocolo, valor e vencimento.
- **Histórico de Contratos & Pagamentos por Cliente**: Visualização consolidada de todos os contratos e amortizações de cada cliente em modal dedicado.

### 3. Controle de Inadimplência & Lista Negra
- **Painel de Atrasados**: Monitoramento em tempo real de parcelas vencidas, cálculo automático de juros moratórios acumulados e dias de atraso.
- **Lista Negra (Blacklist)**: Bloqueio automático ou manual de clientes com inadimplência crítica, com registro de motivo, histórico e protocolo de dívida.

### 4. Inteligência Financeira & Relatórios
- **Dashboard Executivo**: Métricas dinâmicas de Capital Total Investido, Faturamento Mensal, Contratos Ativos e Quantidade em Atraso.
- **Histórico Analítico com Gráficos**: Gráficos interativos (Barras, Linhas e Pizza) desenvolvidos com Recharts para visualização da evolução financeira.
- **Exportação em PDF e Excel (.xlsx)**: Exportação com 1 clique de relatórios financeiros e listas de contratos/clientes.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: [React 19](https://react.dev/) + [React Router 7](https://reactrouter.com/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth e Realtime)
- **Cache & State Management**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Visualização de Dados**: [Recharts](https://recharts.org/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Relatórios & Arquivos**: `jspdf`, `jspdf-autotable`, `xlsx`, `date-fns`
- **PWA**: `vite-plugin-pwa` (Instalável e otimizado para Desktop e Mobile)
- **Linter**: `oxlint`

---

## 📦 Instalação e Configuração

### Pré-requisitos
- **Node.js**: v18.0.0 ou superior
- **npm** ou **yarn**
- Uma conta no [Supabase](https://supabase.com/)

### 1. Clonar o repositório e instalar dependências
```bash
git clone https://github.com/seu-usuario/easyaccount.git
cd easyaccount
npm install
```

### 2. Configurar o Banco de Dados no Supabase
1. No painel do seu projeto Supabase, acesse **SQL Editor**.
2. Abra o arquivo [`src/supabase/schema.sql`](src/supabase/schema.sql), copie todo o seu conteúdo e execute-o.
3. Este script criará automaticamente todas as tabelas:
   - `users` (perfis de usuário)
   - `clients` (cadastro de clientes)
   - `contracts` (contratos de empréstimo/mútuo)
   - `loans` (empréstimos legados e parcelas)
   - `payments` (registro de amortizações)
   - `blacklist` (clientes bloqueados)
   - `transactions` (movimentações financeiras)
   - Triggers de `updated_at`, índices e políticas de Row Level Security (RLS).

### 3. Configurar as Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as credenciais do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 4. Executar em Desenvolvimento
```bash
npm run dev
```

### 5. Build de Produção e Verificação
```bash
npm run build
npm run preview
```

---

## 📁 Estrutura de Pastas

```
EasyAccount/
├── public/
│   ├── icons/                 # Ícones da aplicação e PWA
│   └── manifest.json          # Manifesto do PWA
├── src/
│   ├── components/            # Componentes visuais reutilizáveis (Button, Card, Input, DatePicker, Modal, Sidebar, Header...)
│   ├── contexts/              # AuthContext (Supabase Auth) e QueryContext (TanStack Query)
│   ├── hooks/                 # Hooks de integração (useClients, useFinancial, useBusinessRules)
│   ├── pages/                 # Telas da aplicação:
│   │   ├── Dashboard.jsx      # Visão executiva e indicadores
│   │   ├── GerarContrato.jsx  # Formulário de simulação e emissão de contratos
│   │   ├── HistoricoContratos.jsx # Consulta, gestão e status de contratos
│   │   ├── ListaClientes.jsx  # Gestão de clientes, pagamentos e WhatsApp
│   │   ├── AdicionarCliente.jsx # Cadastro de clientes com validação
│   │   ├── Atrasados.jsx      # Gestão de cobrança e inadimplência
│   │   ├── ListaNegra.jsx     # Bloqueio de clientes de alto risco
│   │   ├── Historico.jsx      # Painel analítico e relatórios com gráficos
│   │   └── Login.jsx          # Autenticação de usuários
│   ├── styles/                # globals.css, theme.js (Design System Dark & Gold)
│   ├── supabase/              # config.js, services.js, schema.sql
│   ├── utils/                 # calculations.js, formatters.js, validators.js, exportUtils.js
│   ├── App.jsx                # Rotas e layout principal
│   └── main.jsx               # Entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## 🔐 Regras Financeiras e Cálculos

- **Juros Diários e Mensais**:
  $$\text{Taxa Diária} = (1 + \text{Taxa Mensal})^{1/30} - 1$$
- **Cálculo de Inadimplência**:
  $$\text{Valor Total Atualizado} = \text{Principal} + \text{Multa (10\%)} + (\text{Juros Diários} \times \text{Dias de Atraso})$$
- **Classificação de Risco**:
  - *Em Dia*: Sem parcelas vencidas.
  - *Em Atraso*: 1 a 29 dias após vencimento.
  - *Crítico*: 30 a 59 dias após vencimento.
  - *Lista Negra*: 60+ dias após o vencimento ou bloqueio manual administrativo.

---

## 📄 Licença

Este projeto está licenciado sob os termos da licença MIT.

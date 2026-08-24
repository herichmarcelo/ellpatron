# Ell Patron - Sistema de Gestão Financeira Premium

Sistema completo de gerenciamento financeiro e controle de empréstimos com tema luxuoso preto e dourado, desenvolvido com React, Firebase e otimizações avançadas de performance.

## 🌟 Características Principais

### Funcionalidades de Negócio
- **Cálculo de Juros Compostos**: Cálculo automático de juros diários e mensais com fórmulas compostas
- **Atualização Automática de Status**: Sistema inteligente que atualiza status de pagamentos (em dia/atraso/crítico)
- **Movimentação para Lista Negra**: Transferência automática para blacklist após X dias de atraso
- **Sistema de Afiliados**: Gestão completa de afiliados com cálculo de comissões em camadas
- **Validação de Dados**: Validação robusta de CPF e telefone brasileiro
- **Formatação Brasileira**: Máscaras de moeda (R$) e datas (DD/MM/AAAA)

### Design e UX
- **Tema Luxuoso**: Paleta de cores preto e dourado com efeitos premium
- **Responsivo**: Otimizado para mobile com experiência touch-friendly
- **Componentes Premium**: Cards, botões e inputs com efeitos de hover e sombras douradas
- **Animações Suaves**: Transições elegantes em todas as interações

### Performance e Otimizações
- **Lazy Loading**: Carregamento sob demanda de imagens e componentes
- **Code Splitting**: Divisão automática de código por rota
- **Cache Inteligente**: Sistema de cache com React Query/TanStack Query
- **PWA Ready**: Aplicação progressiva com suporte offline
- **Otimização Mobile**: Meta tags específicas para iOS e Android

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 19.2**: Biblioteca principal com hooks modernos
- **Vite 8.2**: Build tool ultra-rápido
- **React Router 7**: Roteamento client-side
- **TanStack Query**: Cache e gerenciamento de dados
- **Recharts**: Gráficos interativos
- **Lucide React**: Ícones modernos

### Backend & Database
- **Firebase**: Autenticação e banco de dados Firestore
- **Firebase Auth**: Sistema de autenticação seguro
- **Cloud Firestore**: Banco de dados NoSQL em tempo real

### Ferramentas de Desenvolvimento
- **Vite PWA**: Configuração PWA automática
- **Oxlint**: Linting rápido e eficiente
- **date-fns**: Manipulação de datas

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Passos de Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/easyaccount.git
cd easyaccount
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Firebase**
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
   - Ative Authentication (Email/Password)
   - Crie um banco Firestore
   - Copie suas credenciais para `src/firebase/config.js`

4. **Configure variáveis de ambiente**
   Crie um arquivo `.env` na raiz:
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

6. **Build para produção**
```bash
npm run build
```

## 📁 Estrutura do Projeto

```
easyaccount/
├── public/
│   ├── manifest.json          # Manifesto PWA
│   ├── icons/                 # Ícones da aplicação
│   └── screenshots/           # Screenshots para lojas
├── src/
│   ├── components/            # Componentes reutilizáveis
│   │   ├── Button.jsx        # Botão com variantes
│   │   ├── Card.jsx          # Cards premium
│   │   ├── Input.jsx         # Inputs com validação
│   │   ├── Modal.jsx         # Modal reutilizável
│   │   ├── Sidebar.jsx       # Navegação lateral
│   │   ├── Header.jsx        # Cabeçalho
│   │   ├── Badge.jsx         # Badges de status
│   │   ├── LazyImage.jsx     # Imagem com lazy loading
│   │   └── WhatsAppButton.jsx # Botão WhatsApp
│   ├── contexts/             # Contextos React
│   │   ├── AuthContext.jsx   # Contexto de autenticação
│   │   └── QueryContext.jsx  # Contexto de cache
│   ├── firebase/             # Configuração Firebase
│   │   ├── config.js         # Configuração do Firebase
│   │   └── services.js       # Serviços Firestore
│   ├── hooks/                # Hooks personalizados
│   │   └── useBusinessRules.js # Regras de negócio
│   ├── pages/                # Páginas da aplicação
│   │   ├── Dashboard.jsx     # Painel principal
│   │   ├── Historico.jsx     # Histórico financeiro
│   │   ├── AdicionarCliente.jsx # Cadastro de clientes
│   │   ├── ListaClientes.jsx # Lista de clientes
│   │   ├── Cobranca.jsx      # Gestão de cobranças
│   │   ├── Atrasados.jsx     # Pagamentos atrasados
│   │   ├── ListaNegra.jsx    # Lista negra
│   │   ├── ListaAfiliados.jsx # Gestão de afiliados
│   │   └── Login.jsx         # Página de login
│   ├── utils/                # Utilitários
│   │   ├── calculations.js   # Cálculos financeiros
│   │   ├── formatters.js     # Formatação de dados
│   │   ├── validators.js     # Validações
│   │   └── mockData.js      # Dados de teste
│   ├── styles/               # Estilos globais
│   ├── App.jsx               # Componente principal
│   ├── App.css               # Estilos principais
│   ├── index.css             # Variáveis CSS
│   └── main.jsx              # Entry point
├── index.html                # HTML template
├── vite.config.js            # Configuração Vite
├── package.json              # Dependências
└── README.md                 # Documentação
```

## 🎨 Tema e Cores

O sistema utiliza uma paleta de cores luxuosa preto e dourado:

```css
/* Fundo */
--bg-primary: #0a0a0a;
--bg-secondary: #1a1a1a;
--bg-card: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);

/* Dourado */
--gold-primary: #FFD700;
--gold-secondary: #D4AF37;
--gold-dark: #B8860B;
--gold-light: #DAA520;

/* Status */
--success: #00d084;
--warning: #ffb800;
--danger: #ff4757;
--info: #3742fa;
```

## 🔐 Regras de Negócio Implementadas

### 1. Cálculo de Juros Compostos
- **Juros Diários**: Calculados usando fórmula de juros compostos
- **Juros Mensais**: Calculados sobre o principal
- **Acréscimo por Atraso**: Juros compostos sobre dias de atraso

### 2. Atualização Automática de Status
- **Em Dia**: Pagamento até a data de vencimento
- **Atraso**: 1-29 dias após vencimento
- **Crítico**: 30+ dias após vencimento
- **Lista Negra**: 60+ dias após vencimento

### 3. Sistema de Afiliados
- **Comissão Base**: 10% sobre juros
- **Comissão em Camadas**: 
  - Silver: 11% (R$ 10.000+ volume mensal)
  - Gold: 12% (R$ 20.000+ volume mensal)
  - Premium: 15% (R$ 50.000+ volume mensal)

### 4. Validações
- **CPF**: Validação completa com dígitos verificadores
- **Telefone**: Validação de formato brasileiro (10/11 dígitos)
- **Email**: Validação de formato padrão
- **Moeda**: Validação de valores monetários

## 📱 PWA Features

A aplicação é uma Progressive Web App completa:

- **Instalável**: Pode ser instalada em desktop e mobile
- **Offline First**: Funciona parcialmente offline
- **Push Notifications**: Suporte para notificações
- **App Shortcuts**: Atalhos para funções principais
- **Splash Screen**: Tela de carregamento personalizada

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Build
npm run build        # Cria build de produção
npm run preview      # Preview do build de produção

# Linting
npm run lint         # Executa oxlint
```

## 🔧 Configuração do Firebase

### Firestore Rules

Regras recomendadas para o Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /clients/{clientId} {
      allow read, write: if request.auth != null;
    }
    match /loans/{loanId} {
      allow read, write: if request.auth != null;
    }
    match /blacklist/{blacklistId} {
      allow read, write: if request.auth != null;
    }
    match /affiliates/{affiliateId} {
      allow read, write: if request.auth != null;
    }
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📊 Estrutura de Dados

### Cliente
```javascript
{
  id: string,
  name: string,
  phone: string,
  cpf: string,
  email: string,
  address: {
    street: string,
    number: string,
    complement: string,
    neighborhood: string,
    city: string,
    state: string
  },
  status: 'active' | 'inactive' | 'blacklisted',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Empréstimo
```javascript
{
  id: string,
  clientId: string,
  protocolNumber: string,
  principal: number,
  interestRate: number,
  months: number,
  startDate: date,
  status: 'active' | 'overdue' | 'critical' | 'paid' | 'blacklisted',
  installments: [
    {
      number: number,
      dueDate: date,
      amount: number,
      paid: boolean,
      paidDate: date
    }
  ],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT.

## 👥 Suporte

Para suporte, abra uma issue no repositório ou entre em contato através do email suporte@easiercontrol.com.

## 🎯 Roadmap

- [ ] Integração com gateways de pagamento
- [ ] Exportação de relatórios em PDF/Excel
- [ ] Notificações push personalizadas
- [ ] Dashboard avançado com mais métricas
- [ ] Integração com WhatsApp Business API
- [ ] Sistema de assinaturas mensais
- [ ] Multi-idioma (i18n)
- [ ] Dark/Light mode toggle
- [ ] Versão mobile nativa (React Native)

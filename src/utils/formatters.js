/**
 * Data formatting utilities
 */

/**
 * Format currency as Brazilian Real
 * @param {number} value - Numeric value
 * @param {boolean} showSymbol - Whether to show R$ symbol
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, showSymbol = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return showSymbol ? 'R$ 0,00' : '0,00';
  }

  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return showSymbol ? `R$ ${formatted}` : formatted;
};

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string (e.g., "R$ 1.234,56")
 * @returns {number} Parsed numeric value
 */
export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;
  
  // Remove R$ symbol and spaces
  const cleaned = currencyString.replace(/[R$\s]/g, '');
  // Replace Brazilian decimal separator with dot
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  
  return parseFloat(normalized) || 0;
};

/**
 * Format date to Brazilian format
 * @param {Date|string} date - Date object or string
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';

  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return dateObj.toLocaleDateString('pt-BR', options);
};

/**
 * Format date to short format (DD/MM)
 * @param {Date|string} date - Date object or string
 * @returns {string} Formatted short date string
 */
export const formatShortDate = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
};

/**
 * Format date to relative time (e.g., "2 days ago")
 * @param {Date|string} date - Date object or string
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - dateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays === -1) return 'Amanhã';
  if (diffDays < -1) return `Em ${Math.abs(diffDays)} dias`;
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
  return `${Math.floor(diffDays / 365)} anos atrás`;
};

/**
 * Format phone number to Brazilian format
 * @param {string} phone - Phone number string
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid Brazilian phone number
  if (cleaned.length === 11) {
    // Mobile: (XX) XXXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // Landline: (XX) XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if format doesn't match
};

/**
 * Format CPF
 * @param {string} cpf - CPF string
 * @returns {string} Formatted CPF
 */
export const formatCPF = (cpf) => {
  if (!cpf) return '';
  
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  
  return cpf;
};

/**
 * Format percentage
 * @param {number} value - Numeric value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  return `${value.toFixed(decimals)}%`;
};

/**
 * Format number with thousands separator
 * @param {number} value - Numeric value
 * @returns {string} Formatted number string
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return value.toLocaleString('pt-BR');
};

/**
 * Format installment number (e.g., "1ª PARCELA")
 * @param {number} current - Current installment
 * @param {number} total - Total installments
 * @returns {string} Formatted installment string
 */
export const formatInstallment = (current, total) => {
  const ordinal = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª',
                   '11ª', '12ª', '13ª', '14ª', '15ª', '16ª', '17ª', '18ª', '19ª', '20ª',
                   '21ª', '22ª', '23ª', '24ª', '25ª', '26ª', '27ª', '28ª', '29ª', '30ª',
                   '31ª', '32ª', '33ª', '34ª', '35ª', '36ª', '37ª', '38ª', '39ª', '40ª',
                   '41ª', '42ª', '43ª', '44ª', '45ª', '46ª', '47ª', '48ª', '49ª', '50ª'];
  
  const ordinalText = ordinal[current - 1] || `${current}ª`;
  return `${ordinalText} PARCELA`;
};

/**
 * Format protocol number (e.g., "PN° 12345")
 * @param {number|string} protocol - Protocol number
 * @returns {string} Formatted protocol string
 */
export const formatProtocol = (protocol) => {
  if (!protocol) return '';
  return `PN° ${protocol}`;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Format address
 * @param {object} address - Address object
 * @returns {string} Formatted address string
 */
export const formatAddress = (address) => {
  if (!address) return '';
  
  // Handle different address structures
  const street = address.street || address.endereco || address.logradouro || '';
  const number = address.number || address.numero || '';
  const complement = address.complement || address.complemento || '';
  const neighborhood = address.neighborhood || address.bairro || '';
  const city = address.city || address.cidade || address.localidade || '';
  const state = address.state || address.estado || address.uf || '';
  const cep = address.cep || '';

  const parts = [
    street,
    number,
    complement,
    neighborhood,
    city,
    state
  ].filter(Boolean);

  const formattedAddress = parts.join(', ');
  
  // Add CEP if available
  if (cep) {
    return formattedAddress ? `${formattedAddress} - CEP: ${cep}` : `CEP: ${cep}`;
  }

  return formattedAddress;
};

/**
 * Generate initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export const getInitials = (name) => {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generate a color based on string (for avatars)
 * @param {string} str - String to generate color from
 * @returns {string} Hex color code
 */
export const stringToColor = (str) => {
  if (!str) return '#D4AF37';
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = ['#D4AF37', '#FFD700', '#B8860B', '#DAA520', '#FFEC8B', '#4CAF50', '#2196F3', '#9C27B0'];
  return colors[Math.abs(hash) % colors.length];
};

export default {
  formatCurrency,
  parseCurrency,
  formatDate,
  formatShortDate,
  formatRelativeTime,
  formatPhone,
  formatCPF,
  formatPercentage,
  formatNumber,
  formatInstallment,
  formatProtocol,
  truncateText,
  formatAddress,
  getInitials,
  stringToColor
};
/**
 * Validation utilities for Brazilian data
 */

/**
 * Validate CPF (Cadastro de Pessoas Físicas)
 * @param {string} cpf - CPF string (with or without formatting)
 * @returns {object} Object with isValid boolean and message
 */
export const validateCPF = (cpf) => {
  if (!cpf) {
    return { isValid: false, message: 'CPF é obrigatório' };
  }

  // Remove all non-numeric characters
  const cleaned = cpf.replace(/\D/g, '');

  // Check if it has 11 digits
  if (cleaned.length !== 11) {
    return { isValid: false, message: 'CPF deve ter 11 dígitos' };
  }

  // Check if all digits are the same (invalid CPF)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return { isValid: false, message: 'CPF inválido' };
  }

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  if (digit1 !== parseInt(cleaned.charAt(9))) {
    return { isValid: false, message: 'CPF inválido' };
  }

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  if (digit2 !== parseInt(cleaned.charAt(10))) {
    return { isValid: false, message: 'CPF inválido' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate Brazilian phone number
 * @param {string} phone - Phone number string (with or without formatting)
 * @returns {object} Object with isValid boolean and message
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, message: 'Telefone é obrigatório' };
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it has 10 or 11 digits (landline or mobile)
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return { isValid: false, message: 'Telefone deve ter 10 ou 11 dígitos' };
  }

  // Check if it starts with valid DDD (11-99, excluding some invalid codes)
  const ddd = parseInt(cleaned.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { isValid: false, message: 'DDD inválido' };
  }

  // Check if mobile number starts with 9 (for 11-digit numbers)
  if (cleaned.length === 11 && cleaned.charAt(2) !== '9') {
    return { isValid: false, message: 'Número de celular deve começar com 9' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate email
 * @param {string} email - Email string
 * @returns {object} Object with isValid boolean and message
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: 'Email é obrigatório' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Email inválido' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate required field
 * @param {string} value - Field value
 * @param {string} fieldName - Field name for error message
 * @returns {object} Object with isValid boolean and message
 */
export const validateRequired = (value, fieldName) => {
  if (!value || value.trim() === '') {
    return { isValid: false, message: `${fieldName} é obrigatório` };
  }
  return { isValid: true, message: '' };
};

/**
 * Validate currency amount
 * @param {number|string} value - Currency value
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {object} Object with isValid boolean and message
 */
export const validateCurrency = (value, min = 0, max = null) => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, message: 'Valor inválido' };
  }

  if (numValue < min) {
    return { isValid: false, message: `Valor deve ser maior que ${min}` };
  }

  if (max !== null && numValue > max) {
    return { isValid: false, message: `Valor deve ser menor que ${max}` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate percentage
 * @param {number|string} value - Percentage value
 * @param {number} min - Minimum value (default 0)
 * @param {number} max - Maximum value (default 100)
 * @returns {object} Object with isValid boolean and message
 */
export const validatePercentage = (value, min = 0, max = 100) => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, message: 'Porcentagem inválida' };
  }

  if (numValue < min || numValue > max) {
    return { isValid: false, message: `Porcentagem deve estar entre ${min}% e ${max}%` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate date
 * @param {string|Date} date - Date value
 * @param {Date} minDate - Minimum date (optional)
 * @param {Date} maxDate - Maximum date (optional)
 * @returns {object} Object with isValid boolean and message
 */
export const validateDate = (date, minDate = null, maxDate = null) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, message: 'Data inválida' };
  }

  if (minDate && dateObj < minDate) {
    return { isValid: false, message: `Data deve ser posterior a ${minDate.toLocaleDateString('pt-BR')}` };
  }

  if (maxDate && dateObj > maxDate) {
    return { isValid: false, message: `Data deve ser anterior a ${maxDate.toLocaleDateString('pt-BR')}` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate Brazilian zip code (CEP)
 * @param {string} cep - CEP string (with or without formatting)
 * @returns {object} Object with isValid boolean and message
 */
export const validateCEP = (cep) => {
  if (!cep) {
    return { isValid: false, message: 'CEP é obrigatório' };
  }

  // Remove all non-numeric characters
  const cleaned = cep.replace(/\D/g, '');

  // Check if it has 8 digits
  if (cleaned.length !== 8) {
    return { isValid: false, message: 'CEP deve ter 8 dígitos' };
  }

  return { isValid: true, message: '' };
};

export default {
  validateCPF,
  validatePhone,
  validateEmail,
  validateRequired,
  validateCurrency,
  validatePercentage,
  validateDate,
  validateCEP
};

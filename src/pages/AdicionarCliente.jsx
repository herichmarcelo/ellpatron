import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Save, X } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAddClient } from '../hooks/useClients';
import { formatCPF, formatPhone } from '../utils/formatters';
import { validateCPF, validatePhone, validateEmail, validateRequired } from '../utils/validators';
import './AdicionarCliente.css';

const AdicionarCliente = () => {
  const navigate = useNavigate();
  const { mutate: addClient, isPending } = useAddClient();

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handlePhoneChange = (e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
    const formatted = formatPhone(value);
    handleInputChange('telefone', formatted);
  };

  const handleCPFChange = (e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
    const formatted = formatCPF(value);
    handleInputChange('cpf', formatted);
  };

  const handleCEPChange = async (e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
    const cleaned = (value || '').replace(/\D/g, '');
    
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    }
    
    handleInputChange('cep', formatted);
    
    // Buscar endereço via ViaCEP quando CEP tiver 8 dígitos
    if (cleaned.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const nomeValidation = validateRequired(formData.nome, 'Nome');
    if (!nomeValidation.isValid) newErrors.nome = nomeValidation.message;

    const telefoneValidation = validatePhone(formData.telefone);
    if (!telefoneValidation.isValid) newErrors.telefone = telefoneValidation.message;

    const cpfValidation = validateCPF(formData.cpf);
    if (!cpfValidation.isValid) newErrors.cpf = cpfValidation.message;

    if (formData.email) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) newErrors.email = emailValidation.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const clientData = {
        name: formData.nome,
        phone: formData.telefone,
        cpf: formData.cpf,
        email: formData.email,
        address: {
          cep: formData.cep,
          street: formData.endereco,
          number: formData.numero,
          complement: formData.complemento,
          neighborhood: formData.bairro,
          city: formData.cidade,
          state: formData.estado
        }
      };

      addClient(clientData, {
        onSuccess: () => {
          setFormData({
            nome: '', cpf: '', telefone: '', email: '',
            cep: '', endereco: '', numero: '', complemento: '',
            bairro: '', cidade: '', estado: ''
          });
          setIsSubmitting(false);
          navigate('/lista-clientes');
        },
        onError: (error) => {
          setErrors({ submit: error.message });
          setIsSubmitting(false);
        }
      });
    } catch (error) {
      setErrors({ submit: error.message });
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/lista-clientes');
  };

  return (
    <div className="adicionar-cliente">
      <div className="adicionar-cliente-header">
        <h2>Adicionar Novo Cliente</h2>
        <Button variant="ghost" icon={X} onClick={handleCancel}>
          Cancelar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="adicionar-cliente-form">
        {/* Personal Information */}
        <Card className="adicionar-cliente-section">
          <div className="adicionar-cliente-section-header">
            <User size={20} />
            <h3>Informações Pessoais</h3>
          </div>
          
          <div className="adicionar-cliente-grid">
            <Input
              label="Nome Completo *"
              placeholder="Digite o nome completo"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              error={errors.nome}
              fullWidth
              required
            />

            <Input
              label="CPF *"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={handleCPFChange}
              error={errors.cpf}
              fullWidth
              required
            />

            <Input
              label="Telefone *"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={handlePhoneChange}
              error={errors.telefone}
              fullWidth
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              fullWidth
            />
          </div>
        </Card>

        {/* Address Information */}
        <Card className="adicionar-cliente-section">
          <div className="adicionar-cliente-section-header">
            <MapPin size={20} />
            <h3>Endereço</h3>
          </div>
          
          <div className="adicionar-cliente-grid">
            <Input
              label="CEP"
              placeholder="00000-000"
              value={formData.cep}
              onChange={handleCEPChange}
              fullWidth
            />

            <Input
              label="Rua"
              placeholder="Nome da rua"
              value={formData.endereco}
              onChange={(e) => handleInputChange('endereco', e.target.value)}
              fullWidth
            />

            <Input
              label="Número"
              placeholder="123"
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              fullWidth
            />

            <Input
              label="Complemento"
              placeholder="Apto, bloco, etc."
              value={formData.complemento}
              onChange={(e) => handleInputChange('complemento', e.target.value)}
              fullWidth
            />

            <Input
              label="Bairro"
              placeholder="Nome do bairro"
              value={formData.bairro}
              onChange={(e) => handleInputChange('bairro', e.target.value)}
              fullWidth
            />

            <Input
              label="Cidade"
              placeholder="Nome da cidade"
              value={formData.cidade}
              onChange={(e) => handleInputChange('cidade', e.target.value)}
              fullWidth
            />

            <Input
              label="Estado"
              placeholder="UF"
              value={formData.estado}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              fullWidth
            />
          </div>
        </Card>

        {/* Form Actions */}
        <div className="adicionar-cliente-actions">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting || isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSubmit}
            loading={isSubmitting || isPending}
            disabled={isSubmitting || isPending}
          >
            {isSubmitting || isPending ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </div>
        
        {errors.submit && (
          <div className="adicionar-cliente-error">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
};

export default AdicionarCliente;
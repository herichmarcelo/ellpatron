import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, MapPin, Save, X, Edit3, ArrowLeft } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAddClient } from '../hooks/useClients';
import { formatCPF, formatPhone } from '../utils/formatters';
import { validateCPF, validatePhone, validateEmail, validateRequired } from '../utils/validators';
import { getClient, updateClient } from '../supabase/services';
import './AdicionarCliente.css';

const AdicionarCliente = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const { mutate: addClient } = useAddClient();

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
  const [loadingClient, setLoadingClient] = useState(isEditing);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      getClient(id)
        .then((result) => {
          if (!isMounted) return;
          if (result.success && result.data) {
            const c = result.data;
            
            // Extrai dados de endereço se estiver em c.address ou nos campos diretos
            let addr = {};
            if (typeof c.address === 'object' && c.address !== null) {
              addr = c.address;
            } else if (typeof c.address === 'string') {
              try {
                addr = JSON.parse(c.address);
              } catch {
                addr = {};
              }
            }

            setFormData({
              nome: c.name || c.nome || '',
              cpf: formatCPF(c.cpf || ''),
              telefone: formatPhone(c.phone || c.telefone || ''),
              email: c.email || '',
              cep: addr.cep || c.zip_code || c.zipCode || c.cep || '',
              endereco: addr.street || c.street || c.endereco || '',
              numero: addr.number || c.number || c.numero || '',
              complemento: addr.complement || c.complement || c.complemento || '',
              bairro: addr.neighborhood || c.neighborhood || c.bairro || '',
              cidade: addr.city || c.city || c.cidade || '',
              estado: addr.state || c.state || c.estado || ''
            });
          } else {
            alert('Cliente não encontrado');
            navigate('/lista-clientes');
          }
          setLoadingClient(false);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error('Erro ao carregar cliente:', err);
          setLoadingClient(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const handleInputChange = (field, e) => {
    const value = e?.target?.value !== undefined ? e.target.value : e;
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors((prev) => ({
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
          setFormData((prev) => ({
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
      // Objeto de dados compatível com o schema do Supabase (address como objeto/JSON)
      const clientPayload = {
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

      if (isEditing) {
        // Modo Edição
        const result = await updateClient(id, clientPayload);
        if (result.success) {
          alert('Cliente atualizado com sucesso!');
          navigate('/lista-clientes');
        } else {
          setErrors({ submit: result.error || 'Erro ao atualizar cliente' });
        }
        setIsSubmitting(false);
      } else {
        // Modo Adição
        addClient(clientPayload, {
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
      }
    } catch (error) {
      setErrors({ submit: error.message });
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/lista-clientes');
  };

  if (loadingClient) {
    return (
      <div className="adicionar-cliente">
        <div className="loading-screen">Carregando dados do cliente...</div>
      </div>
    );
  }

  return (
    <div className="adicionar-cliente">
      <div className="adicionar-cliente-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isEditing ? <Edit3 size={24} color="#d4af37" /> : <User size={24} color="#d4af37" />}
          <h2>{isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</h2>
        </div>
        <Button variant="ghost" icon={ArrowLeft} onClick={handleCancel}>
          Voltar para Lista
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
              onChange={(e) => handleInputChange('nome', e)}
              error={errors.nome}
              fullWidth
            />

            <Input
              label="CPF *"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={handleCPFChange}
              error={errors.cpf}
              maxLength={14}
              fullWidth
            />

            <Input
              label="Telefone (WhatsApp) *"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={handlePhoneChange}
              error={errors.telefone}
              maxLength={15}
              fullWidth
            />

            <Input
              label="Email"
              type="email"
              placeholder="cliente@email.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e)}
              error={errors.email}
              fullWidth
            />
          </div>
        </Card>

        {/* Address */}
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
              maxLength={9}
              fullWidth
            />

            <Input
              label="Endereço"
              placeholder="Rua, Avenida, etc."
              value={formData.endereco}
              onChange={(e) => handleInputChange('endereco', e)}
              fullWidth
            />

            <Input
              label="Número"
              placeholder="123"
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e)}
              fullWidth
            />

            <Input
              label="Complemento"
              placeholder="Apto 101, Bloco B"
              value={formData.complemento}
              onChange={(e) => handleInputChange('complemento', e)}
              fullWidth
            />

            <Input
              label="Bairro"
              placeholder="Nome do bairro"
              value={formData.bairro}
              onChange={(e) => handleInputChange('bairro', e)}
              fullWidth
            />

            <Input
              label="Cidade"
              placeholder="Nome da cidade"
              value={formData.cidade}
              onChange={(e) => handleInputChange('cidade', e)}
              fullWidth
            />

            <Input
              label="Estado"
              placeholder="UF (ex: SP)"
              value={formData.estado}
              onChange={(e) => handleInputChange('estado', e)}
              maxLength={2}
              fullWidth
            />
          </div>
        </Card>

        {errors.submit && (
          <div className="adicionar-cliente-error">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="adicionar-cliente-actions">
          <Button
            type="button"
            variant="secondary"
            icon={X}
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? (isEditing ? 'Salvando...' : 'Cadastrando...') : (isEditing ? 'Atualizar Cliente' : 'Salvar Cliente')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdicionarCliente;
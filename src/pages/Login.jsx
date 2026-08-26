import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value;
    const name = e.target.name;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card">
          <div className="login-header">
           <img
            src="/icons/ELLPATRON.png"
            alt="ELLPATRON"
            className="login-logo"
          />
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
              required
              fullWidth
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              icon={Lock}
              rightAction={
                <button
                  type="button"
                  className="input-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              required
              fullWidth
            />

            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              size="large"
            >
              Entrar
            </Button>
          </form>

          <div className="login-footer">
            <p className="login-footer-text">
              Sistema de gerenciamento financeiro e controle de empréstimos
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;

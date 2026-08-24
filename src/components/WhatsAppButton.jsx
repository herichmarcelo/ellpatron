import React from 'react';
import { MessageCircle } from 'lucide-react';
import './WhatsAppButton.css';

const WhatsAppButton = ({ phone, message = 'Olá! Como posso ajudar?', className = '' }) => {
  const handleClick = () => {
    const formattedPhone = phone ? phone.replace(/\D/g, '') : '';
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      className={`whatsapp-button ${className}`}
      onClick={handleClick}
      aria-label="Contato via WhatsApp"
    >
      <MessageCircle size={24} />
    </button>
  );
};

export default WhatsAppButton;
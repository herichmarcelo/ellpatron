import React, { useState } from 'react';
import { Menu, Bell, User, Search, Sparkles } from 'lucide-react';
import Badge from './Badge';
import './Header.css';

const Header = ({ onMenuClick, title, showDateSelector = false, selectedDate, onDateChange }) => {
  const [notifications] = useState(3);

  const handlePrevDay = () => {
    if (onDateChange && selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      onDateChange(newDate);
    }
  };

  const handleNextDay = () => {
    if (onDateChange && selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      onDateChange(newDate);
    }
  };

  const handleToday = () => {
    if (onDateChange) {
      onDateChange(new Date());
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuClick} aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <div className="header-title-wrapper">
          <Sparkles size={16} className="header-title-icon" />
          <h1 className="header-title">{title}</h1>
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={16} className="header-search-icon" />
          <input
            type="text"
            placeholder="Buscar..."
            className="header-search-input"
          />
        </div>

        <button className="header-action-btn" aria-label="Notificações">
          <Bell size={18} />
          {notifications > 0 && (
            <Badge variant="red" count={notifications} className="header-action-badge" />
          )}
        </button>

        <button className="header-action-btn" aria-label="Perfil">
          <User size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
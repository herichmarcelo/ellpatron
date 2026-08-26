import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

const CustomSelect = ({ label, options = [], value, onChange, placeholder = "Selecione..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o menu se o usuário clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Encontra a opção selecionada atual para exibir no botão
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      {label && <label className="custom-select-label">{label}</label>}
      
      {/* Botão que abre/fecha o menu */}
      <div 
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex="0"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={!selectedOption ? 'text-placeholder' : 'text-selected'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          className={`custom-select-icon ${isOpen ? 'rotate' : ''}`} 
        />
      </div>

      {/* Lista suspensa de opções */}
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-item ${value === option.value ? 'is-selected' : ''}`}
              onClick={() => {
                if (onChange) onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              {/* Mostra um ícone de "check" dourado na opção selecionada */}
              {value === option.value && <Check size={16} className="check-icon" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import './DatePicker.css';

const formatDateToInput = (date) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
};

const parseInputToDate = (input) => {
  if (!input) return null;
  
  const parts = input.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  
  return date;
};

const DatePicker = ({ 
  value, 
  onChange, 
  label, 
  error, 
  required = false, 
  fullWidth = false,
  placeholder = 'dd/mm/aaaa',
  disabled = false,
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [prevValue, setPrevValue] = useState(value);
  const [inputValue, setInputValue] = useState(() => formatDateToInput(value));
  const pickerRef = useRef(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setInputValue(formatDateToInput(value));
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    
    // Auto-format as user types
    const cleaned = rawVal.replace(/\D/g, '');
    let formatted = '';
    
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 2);
      if (cleaned.length > 2) {
        formatted += '/' + cleaned.substring(2, 4);
        if (cleaned.length > 4) {
          formatted += '/' + cleaned.substring(4, 8);
        }
      }
    }
    
    setInputValue(formatted);
    
    const date = parseInputToDate(formatted);
    if (date) {
      onChange(date);
    }
  };

  const handleDateSelect = (date) => {
    onChange(date);
    setIsOpen(false);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const isDateDisabled = (date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!value) return false;
    const valueDate = typeof value === 'string' ? new Date(value) : value;
    return date.getDate() === valueDate.getDate() &&
           date.getMonth() === valueDate.getMonth() &&
           date.getFullYear() === valueDate.getFullYear();
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const weekHeaders = weekDays.map(day => (
      <div key={day} className="datepicker-weekday">
        {day}
      </div>
    ));
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="datepicker-day datepicker-day--empty" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const disabledDate = isDateDisabled(date);
      const today = isToday(date);
      const selected = isSelected(date);
      
      days.push(
        <button
          key={day}
          type="button"
          className={`datepicker-day ${disabledDate ? 'datepicker-day--disabled' : ''} ${today ? 'datepicker-day--today' : ''} ${selected ? 'datepicker-day--selected' : ''}`}
          onClick={() => !disabledDate && handleDateSelect(date)}
          disabled={disabledDate}
        >
          {day}
        </button>
      );
    }
    
    return (
      <div className="datepicker-calendar">
        <div className="datepicker-header">
          <button
            type="button"
            className="datepicker-nav-button"
            onClick={previousMonth}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="datepicker-month-year">
            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <button
            type="button"
            className="datepicker-nav-button"
            onClick={nextMonth}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="datepicker-weekdays">
          {weekHeaders}
        </div>
        
        <div className="datepicker-days">
          {days}
        </div>
      </div>
    );
  };

  const wrapperClasses = [
    'datepicker-wrapper',
    fullWidth ? 'datepicker-wrapper--full-width' : '',
    error ? 'datepicker-wrapper--error' : '',
    disabled ? 'datepicker-wrapper--disabled' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses} ref={pickerRef}>
      {label && (
        <label className="datepicker-label">
          {label}
          {required && <span className="datepicker-label__required">*</span>}
        </label>
      )}
      
      <div className="datepicker-input-container">
        <input
          type="text"
          className="datepicker-input"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          maxLength={10}
        />
        <button
          type="button"
          className="datepicker-toggle-button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <Calendar size={18} />
        </button>
      </div>
      
      {error && <p className="datepicker-error">{error}</p>}
      
      {isOpen && !disabled && (
        <div className="datepicker-dropdown">
          {renderCalendar()}
        </div>
      )}
    </div>
  );
};

export default DatePicker;

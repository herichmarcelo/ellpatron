import React from 'react';
import './Input.css';

const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  rightIcon: RightIcon,
  rightAction,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  fullWidth = false,
  maxLength,
  className = '',
  ...props
}) => {
  const baseClasses = 'input';
  const errorClass = error ? 'input--error' : '';
  const disabledClass = disabled ? 'input--disabled' : '';
  const fullWidthClass = fullWidth ? 'input--full-width' : '';
  const withIconClass = Icon ? 'input--with-icon' : '';
  const withRightIconClass = (RightIcon || rightAction) ? 'input--with-right-icon' : '';
  const combinedClasses = [
    baseClasses,
    errorClass,
    disabledClass,
    fullWidthClass,
    withIconClass,
    withRightIconClass,
    className
  ].filter(Boolean).join(' ');

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="input-label__required">*</span>}
        </label>
      )}
      <div className="input-container">
        {Icon && (
          <div className="input-icon">
            <Icon size={18} />
          </div>
        )}
        <input
          type={type}
          className={combinedClasses}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          {...props}
        />
        {rightAction ? (
          <div className="input-right-action">
            {rightAction}
          </div>
        ) : RightIcon ? (
          <div className="input-right-icon">
            <RightIcon size={18} />
          </div>
        ) : null}
      </div>
      {error && <p className="input-error">{error}</p>}
      {helperText && !error && <p className="input-helper">{helperText}</p>}
    </div>
  );
};

export default Input;
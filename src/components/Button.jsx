import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const baseClasses = 'button';
  const variantClasses = `button--${variant}`;
  const sizeClasses = `button--${size}`;
  const disabledClasses = (disabled || loading) ? 'button--disabled' : '';
  const fullWidthClass = fullWidth ? 'button--full-width' : '';
  const loadingClass = loading ? 'button--loading' : '';

  const combinedClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    disabledClasses,
    fullWidthClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="button__spinner" />}
      {Icon && iconPosition === 'left' && !loading && (
        <span className="button__icon button__icon--left">
          <Icon size={18} />
        </span>
      )}
      <span className="button__content">{children}</span>
      {Icon && iconPosition === 'right' && !loading && (
        <span className="button__icon button__icon--right">
          <Icon size={18} />
        </span>
      )}
    </button>
  );
};

export default Button;
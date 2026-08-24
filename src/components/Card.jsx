import React from 'react';
import './Card.css';

const Card = ({
  children,
  title,
  subtitle,
  icon: Icon,
  variant = 'default',
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'card';
  const variantClasses = `card--${variant}`;
  const hoverableClass = hoverable ? 'card--hoverable' : '';
  const clickableClass = clickable ? 'card--clickable' : '';
  const combinedClasses = [
    baseClasses,
    variantClasses,
    hoverableClass,
    clickableClass,
    className
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={combinedClasses}
      onClick={handleClick}
      {...props}
    >
      {(title || Icon) && (
        <div className="card__header">
          {Icon && <div className="card__icon"><Icon size={24} /></div>}
          <div className="card__header-content">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
        </div>
      )}
      <div className="card__content">
        {children}
      </div>
    </div>
  );
};

export default Card;
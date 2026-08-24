import React from 'react';
import './Badge.css';

const Badge = ({
  children,
  variant = 'default',
  size = 'medium',
  dot = false,
  count = null,
  maxCount = 99,
  className = '',
  ...props
}) => {
  const baseClasses = 'badge';
  const variantClasses = `badge--${variant}`;
  const sizeClasses = `badge--${size}`;
  const dotClass = dot ? 'badge--dot' : '';
  const combinedClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    dotClass,
    className
  ].filter(Boolean).join(' ');

  const displayCount = count !== null && count > maxCount ? `${maxCount}+` : count;

  if (dot) {
    return <span className={combinedClasses} {...props} />;
  }

  if (count !== null) {
    return (
      <span className={combinedClasses} {...props}>
        {displayCount}
      </span>
    );
  }

  return (
    <span className={combinedClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;
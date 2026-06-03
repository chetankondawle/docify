import React from 'react';
import styles from './Button.module.css';

/**
 * Reusable Button component
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} size    - 'sm' | 'md' | 'lg'
 * @param {boolean} loading
 * @param {boolean} disabled
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...rest
}) => {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    loading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className={styles.spinner} /> : null}
      {children}
    </button>
  );
};

export default Button;

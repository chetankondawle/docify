import React from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

const Button = ({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, type = 'button',
  onClick, className = '', ...rest
}) => {
  const muiVariant = variant === 'primary' ? 'contained' : variant === 'secondary' ? 'outlined' : 'text';
  const muiSize = size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium';
  const color = variant === 'danger' ? 'error' : variant === 'success' ? 'success' : 'primary';

  return (
    <MuiButton
      type={type}
      variant={muiVariant}
      size={muiSize}
      color={color}
      disabled={disabled || loading}
      onClick={onClick}
      className={className}
      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
      {...rest}
    >
      {children}
    </MuiButton>
  );
};

export default Button;
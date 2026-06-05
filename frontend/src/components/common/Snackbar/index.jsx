import React, { useEffect, useState, useCallback } from 'react';
import styles from './Snackbar.module.css';

const AUTO_DISMISS_MS = 5000;
const ANIMATION_DURATION_MS = 300;

const icons = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
};

const Snackbar = ({ message, type = 'error', onClose }) => {
  const [exiting, setExiting] = useState(false);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(onClose, ANIMATION_DURATION_MS);
  }, [onClose]);

  useEffect(() => {
    if (!message) return;
    setExiting(false);
    const timer = setTimeout(handleClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, handleClose]);

  if (!message) return null;

  return (
    <div className={`${styles.snackbar} ${styles[type]} ${exiting ? styles.exit : styles.enter}`}>
      <span className={styles.icon}>{icons[type] || icons.info}</span>
      <span className={styles.message}>{message}</span>
      <button onClick={handleClose} className={styles.close} aria-label="Dismiss">×</button>
    </div>
  );
};

export default Snackbar;

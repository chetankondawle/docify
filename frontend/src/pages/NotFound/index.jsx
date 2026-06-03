import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

const NotFoundPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.code}>404</h1>
      <h2 className={styles.title}>Page Not Found</h2>
      <p className={styles.message}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link to="/" className={styles.link}>
        &larr; Back to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;

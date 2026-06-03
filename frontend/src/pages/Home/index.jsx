import React from 'react';
import useApi from '@hooks/useApi';
import { fetchHealthStatus } from '@services/healthService';
import Button from '@components/common/Button';
import styles from './Home.module.css';

const HomePage = () => {
  const { data, loading, error, execute } = useApi(fetchHealthStatus);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Welcome to Docify</h1>
        <p className={styles.subtitle}>
          A modern full-stack application with Express MVC backend and enterprise React frontend.
        </p>
        <Button onClick={execute} loading={loading}>
          Check API Health
        </Button>
      </section>

      {error && (
        <div className={styles.alert} data-type="error">
          {error}
        </div>
      )}

      {data && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>API Health Status</h2>
          <pre className={styles.pre}>{JSON.stringify(data.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default HomePage;

import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Header.module.css';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Documents', to: '/documents' },
  // Add more nav links here
];

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Docify
        </Link>
        <nav className={styles.nav}>
          {navLinks.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;

import React from 'react';
import styles from './Footer.module.scss';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <p className={styles.text}>© 2026 María Belén Corvalán Amil</p>
    </footer>
  );
};

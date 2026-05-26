import React from 'react';
import styles from './SectionLabel.module.scss';

interface SectionLabelProps {
  children: React.ReactNode;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children }) => {
  return <h2 className={styles.label}>{children}</h2>;
};

'use client';

import React from 'react';
import { Header } from '@/components/ui/Header/Header';
import styles from './Hero.module.scss';

export const Hero: React.FC = () => {
  return (
    <section id="hero" className={styles.hero}>
      <Header variant="home" />
    </section>
  );
};
'use client';

import React from 'react';

interface RevealTextProps {
  children: string;
  className?: string;
  delay?: number;
}

export const RevealText: React.FC<RevealTextProps> = ({
  children,
  className = '',
  delay = 0,
}) => {
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        animation: `revealText 0.6s ease-out forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      {children}
    </span>
  );
};
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'development') return;

    const value = metric.name === 'CLS' ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value);

    console.log(`[web-vitals] ${metric.name}`, {
      value,
      rating: metric.rating,
      id: metric.id,
    });
  });

  return null;
}

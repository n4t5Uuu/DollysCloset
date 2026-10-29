'use client';

import { useEffect, useState } from 'react';

type Recharts = typeof import('recharts');

/** Loads recharts on demand so it stays out of the initial bundle. Returns null until ready. */
export function useRecharts() {
  const [recharts, setRecharts] = useState<Recharts | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('recharts')
      .then((module) => {
        if (!cancelled) setRecharts(module);
      })
      .catch((error) => console.error('Failed to load charts', error));
    return () => {
      cancelled = true;
    };
  }, []);

  return recharts;
}

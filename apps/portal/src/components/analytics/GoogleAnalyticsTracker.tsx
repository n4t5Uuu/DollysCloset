'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ReactGA from 'react-ga4';

export function GoogleAnalyticsTracker() {
  const pathname = usePathname();

  // Initialize once on mount, then send first pageview
  useEffect(() => {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!measurementId) {
      console.warn('[GA] NEXT_PUBLIC_GA_MEASUREMENT_ID is not set');
      return;
    }
    console.log('[GA] Initializing with', measurementId);
    ReactGA.initialize(measurementId);
    ReactGA.send({ hitType: 'pageview', page: pathname });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send pageview on subsequent route changes
  useEffect(() => {
    if (!ReactGA.isInitialized) return;
    console.log('[GA] Pageview:', pathname);
    ReactGA.send({ hitType: 'pageview', page: pathname });
  }, [pathname]);

  return null;
}

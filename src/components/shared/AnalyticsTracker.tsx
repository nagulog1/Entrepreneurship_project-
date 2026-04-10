"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { logAnalyticsEvent } from '@/lib/analytics';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    const pageLocation = query ? `${pathname}?${query}` : pathname;

    logAnalyticsEvent('screen_view', {
      screen_name: pathname,
      page_location: pageLocation,
      page_path: pathname,
    });
  }, [pathname, searchParams]);

  return null;
}

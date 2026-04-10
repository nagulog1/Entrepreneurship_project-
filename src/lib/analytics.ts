import type { Analytics } from 'firebase/analytics';
import { getFirebaseAnalytics } from '@/lib/firebase';

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

let analyticsInstance: Analytics | null | undefined;

async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (analyticsInstance !== undefined) return analyticsInstance;
  analyticsInstance = await getFirebaseAnalytics();
  return analyticsInstance;
}

export async function logAnalyticsEvent(eventName: string, params: AnalyticsParams = {}): Promise<void> {
  try {
    const analytics = await getAnalyticsInstance();
    if (!analytics) return;

    const { logEvent } = await import('firebase/analytics');
    logEvent(analytics, eventName, params);
  } catch {
    // no-op in unsupported environments
  }
}

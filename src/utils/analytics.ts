/**
 * Google Analytics 4 (GA4) & Conversion Tracking Helper
 * Supports privacy-compliant event dispatching with user consent
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const STORAGE_KEY_CONSENT = 'bank_converter_cookie_consent';

export function getCookieConsent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_CONSENT) === 'granted';
  } catch {
    return false;
  }
}

export function setCookieConsent(granted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONSENT, granted ? 'granted' : 'denied');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: 'denied',
      });
    }
  } catch (err) {
    console.error('Consent storage error:', err);
  }
}

/**
 * Dispatch custom GA4 events
 * Standard events: upload_start, convert_success, export_click, share_click
 */
export function trackEvent(
  eventName: 'upload_start' | 'convert_success' | 'export_click' | 'share_click' | string,
  eventParams?: Record<string, any>
): void {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
  } catch (err) {
    // Fail silently in environments without GA
  }
}

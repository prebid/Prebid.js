/**
 * A Google Consent Mode signal's value, as passed to `gtag('consent', ...)`.
 */
export type GCMSignalValue = 'granted' | 'denied';

/**
 * Consent data for Google Consent Mode v2, as provided by `consentManagementGcm`: the page's current Consent Mode
 * state, folded from its `gtag('consent', 'default' | 'update', ...)` calls, using gtag's own keys and values.
 * Signals that the page never set are left out; other signals than the four below are passed through as they are.
 *
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */
export type GCMConsentData = {
  ad_storage?: GCMSignalValue;
  analytics_storage?: GCMSignalValue;
  ad_user_data?: GCMSignalValue;
  ad_personalization?: GCMSignalValue;
  [signal: string]: GCMSignalValue | undefined;
};

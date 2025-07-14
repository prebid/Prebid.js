import { getStorageManager } from '../../src/storageManager.js';
const COOKIE_KEY_MGUID = '__mguid_';

export function cookieSync(syncOptions, gdprConsent, uspConsent, bidderCode, cookieOrigin, ckIframeUrl, cookieTime) {
  const storage = getStorageManager({bidderCode: bidderCode});
  const origin = encodeURIComponent(location.origin || `https://${location.host}`);
  let syncParamUrl = `dm=${origin}`;

  if (gdprConsent && gdprConsent.consentString) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      syncParamUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      syncParamUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
    }
  }
  if (uspConsent && uspConsent.consentString) {
    syncParamUrl += `&ccpa_consent=${uspConsent.consentString}`;
  }

  if (syncOptions.iframeEnabled) {
    window.addEventListener('message', function handler(event) {
      if (!event.data || event.origin !== cookieOrigin) {
        return;
      }

      this.removeEventListener('message', handler);

      event.stopImmediatePropagation();

      const response = event.data;
      if (!response.optout && response.mguid) {
        storage.setCookie(COOKIE_KEY_MGUID, response.mguid, cookieTime);
      }
    }, true);
    return [
      {
        type: 'iframe',
        url: `${ckIframeUrl}?${syncParamUrl}`
      }
    ];
  }
}

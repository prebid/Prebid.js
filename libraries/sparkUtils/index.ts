import { hasPurpose1Consent } from "../../src/utils/gdpr.js";
import { SyncType } from '../../src/userSync.js';
import { ServerResponse } from '../../src/adapters/bidderFactory.js';
import { TCFConsentData } from '../../modules/consentManagementTcf.js';
import { GPPConsentData } from '../../modules/consentManagementGpp.js';

type ConsentParams = {
  gdprConsent?: {
    gdprApplies?: boolean;
    consentString?: string;
  };
  uspConsent?: string;
  gppConsent?: {
    gppString?: string;
    applicableSections?: number[];
  };
};

type UserSync = { type: SyncType; url: string };

let lastSiteId: string | undefined;

export function setUserSyncContext({ siteId }: { siteId?: string }) {
  if (typeof siteId === 'string' && siteId.length > 0) {
    lastSiteId = siteId;
  }
}

const buildConsentQuery = ({ gdprConsent, uspConsent, gppConsent }: ConsentParams): string[] => {
  const params: string[] = [];
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      params.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
    }
    if (typeof gdprConsent.consentString === 'string') {
      params.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`);
    }
  }
  if (typeof uspConsent === 'string' && uspConsent.length > 0) {
    params.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
  }
  if (gppConsent?.gppString) {
    params.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
    if (Array.isArray(gppConsent.applicableSections)) {
      params.push(`gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`);
    }
  }
  return params;
};

const appendQueryParams = (url: string, params: string[]): string => {
  if (!params.length) return url;
  const hasQuery = url.includes('?');
  const needsSeparator = !url.endsWith('?') && !url.endsWith('&');
  const separator = hasQuery ? (needsSeparator ? '&' : '') : '?';
  return `${url}${separator}${params.join('&')}`;
};

export function getUserSyncs(
  syncOptions: { iframeEnabled: boolean; pixelEnabled: boolean },
  serverResponses: ServerResponse[],
  gdprConsent: TCFConsentData,
  uspConsent: string,
  gppConsent: GPPConsentData
): UserSync[] {
  if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
    return [];
  }
  if (!hasPurpose1Consent(gdprConsent)) {
    return [];
  }
  if (!Array.isArray(serverResponses) || serverResponses.length === 0) {
    return [];
  }

  const consentParams = buildConsentQuery({ gdprConsent, uspConsent, gppConsent });
  const syncs: UserSync[] = [];
  const seen = new Set<string>();

  const pushSync = (type: SyncType, url: string) => {
    if (type === 'iframe' ? !syncOptions.iframeEnabled : !syncOptions.pixelEnabled) {
      return;
    }
    const finalUrl = consentParams.length ? appendQueryParams(url, consentParams) : url;
    const key = `${type}|${finalUrl}`;
    if (!seen.has(key)) {
      seen.add(key);
      syncs.push({ type, url: finalUrl });
    }
  };

  for (const response of serverResponses) {
    const cookieSync = response?.body?.cookie_sync ?? response?.body?.ext?.cookie_sync;
    if (!cookieSync) continue;

    if (Array.isArray(cookieSync)) {
      for (const entry of cookieSync) {
        const userSync = entry?.usersync ?? entry;
        const url = userSync?.url;
        if (typeof url !== 'string' || url.length === 0) continue;
        const rawType = typeof userSync?.type === 'string' ? userSync.type.toLowerCase() : '';
        const syncType: SyncType = rawType === 'iframe' ? 'iframe' : 'image';
        pushSync(syncType, url);
      }
      continue;
    }

    const bidderStatus = Array.isArray(cookieSync.bidder_status) ? cookieSync.bidder_status : [];
    for (const bidder of bidderStatus) {
      const userSync = bidder?.usersync;
      const url = userSync?.url;
      if (typeof url !== 'string' || url.length === 0) continue;
      const rawType = typeof userSync?.type === 'string' ? userSync.type.toLowerCase() : '';
      const syncType: SyncType = rawType === 'iframe' ? 'iframe' : 'image';
      pushSync(syncType, url);
    }
  }

  return syncs;
}
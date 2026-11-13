/**
 * This module adds Acxiom Real ID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/acxiomRealIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { logError, getWindowSelf } from '../src/utils.js';
import { gdprDataHandler, uspDataHandler, gppDataHandler } from '../src/adapterManager.js';

import type { IdProviderSpec, UserIdConfig, EID } from './userId/spec.ts';
import type { AllConsentData } from '../src/consentHandler.ts';

const MODULE_NAME = 'acxiomRealId' as const;
const DEFAULT_API_URL = 'https://ids.api.gcprivacy.id/v1/eid/l';
const DEFAULT_SOURCE_ID = 'acxiom.id';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });
export const dep = {
  ajaxBuilder
};

export type AcxiomRealIdParams = {
  /** Partner ID issued by GrowthCode on behalf of Acxiom */
  partnerId: string;
  /** SHA-256 hashed email for improved match rate */
  hem?: string;
  /** EID source to request from the lookup API. Defaults to 'acxiom.id' */
  sourceId?: string;
  /** Override the full API endpoint URL */
  apiUrl?: string;
};

export type AcxiomRealIdValue = {
  /** The resolved Acxiom Real ID token */
  id: string;
  /** Agent type per OpenRTB spec (1 = cookie/device, 2 = in-app, 3 = person-based) */
  atype: number;
};

declare module './userId/spec' {
  interface UserId {
    acxiomRealId: AcxiomRealIdValue;
  }
  interface ProvidersToId {
    acxiomRealId: 'acxiomRealId';
  }
  interface ProviderParams {
    acxiomRealId: AcxiomRealIdParams;
  }
}

const US_GPP_SID_API: Record<number, string> = {
  7: 'usnat',
  8: 'usca',
  9: 'usva',
  10: 'usco',
  11: 'usut',
  12: 'usct'
};

interface GppSectionData {
  SaleOptOut?: number;
  SharingOptOut?: number;
  [key: string]: unknown;
}

interface GppData {
  applicableSections?: number[];
  parsedSections?: Record<string, GppSectionData | GppSectionData[]>;
}

function flatSection(subsections: GppSectionData | GppSectionData[]): GppSectionData {
  if (!Array.isArray(subsections)) return subsections;
  return subsections.reduceRight((merged, section) => Object.assign(section, merged), {} as GppSectionData);
}

function isGppOptedOut(gppData: GppData | null | undefined): boolean {
  if (!gppData || !gppData.applicableSections || !gppData.parsedSections) {
    return false;
  }
  for (const sid of gppData.applicableSections) {
    const apiName = US_GPP_SID_API[sid];
    if (!apiName) continue;
    const sectionData = flatSection(gppData.parsedSections[apiName]);
    if (sectionData && (sectionData.SaleOptOut === 1 || sectionData.SharingOptOut === 1)) {
      return true;
    }
  }
  return false;
}

function isConsentBlocked(consentData: Partial<AllConsentData> | undefined): boolean {
  if (!consentData) {
    return false;
  }

  const gdpr = consentData.gdpr;
  if (gdpr && (gdpr.gdprApplies || gdpr.consentString)) {
    return true;
  }

  const usp = consentData.usp;
  if (usp && typeof usp === 'string' && usp.length >= 3 && usp.charAt(2) === 'Y') {
    return true;
  }

  if (isGppOptedOut(consentData.gpp as GppData)) {
    return true;
  }

  return false;
}

function isConsentBlockedByHandlers(): boolean {
  const gdpr = gdprDataHandler.getConsentData();
  if (gdpr && (gdpr.gdprApplies || gdpr.consentString)) {
    return true;
  }
  const usp = uspDataHandler.getConsentData();
  if (usp && typeof usp === 'string' && usp.length >= 3 && usp.charAt(2) === 'Y') {
    return true;
  }
  const gpp = gppDataHandler.getConsentData();
  if (isGppOptedOut(gpp as GppData)) {
    return true;
  }
  return false;
}

function deleteStoredToken(config: UserIdConfig<typeof MODULE_NAME>) {
  const storageName = config?.storage?.name || MODULE_NAME;
  const expired = new Date(0).toUTCString();
  if (storage.localStorageIsEnabled()) {
    ['', '_exp', '_cst', '_last'].forEach(suffix => {
      storage.removeDataFromLocalStorage(`${storageName}${suffix}`);
    });
  }
  if (storage.cookiesAreEnabled()) {
    ['', '_cst', '_last'].forEach(suffix => {
      storage.setCookie(`${storageName}${suffix}`, '', expired);
    });
  }
}

function buildLookupUrl(apiUrl: string | undefined): string {
  return (apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
}

export const acxiomRealIdSubmodule: IdProviderSpec<typeof MODULE_NAME> = {
  name: MODULE_NAME,

  decode(value, config) {
    if (isConsentBlockedByHandlers()) {
      deleteStoredToken(config);
      return undefined;
    }
    if (value && typeof value === 'string') {
      return { acxiomRealId: { id: value, atype: 1 } };
    }
    if (value && typeof value === 'object' && (value as AcxiomRealIdValue).id) {
      const v = value as AcxiomRealIdValue;
      return { acxiomRealId: { id: v.id, atype: v.atype || 1 } };
    }
    return undefined;
  },

  getId(config, consentData, storedId) {
    const configParams = config?.params || {} as AcxiomRealIdParams;
    const { partnerId, apiUrl, sourceId, hem } = configParams;

    if (!partnerId) {
      logError('AcxiomRealId: partnerId is required.');
      return undefined;
    }

    if (isConsentBlocked(consentData)) {
      deleteStoredToken(config);
      return undefined;
    }

    if (storedId) {
      return { id: storedId };
    }

    const url = buildLookupUrl(apiUrl);
    const payload: Record<string, string> = {
      partnerId,
      ip: '',
      userAgent: getWindowSelf().navigator?.userAgent || '',
      sourceId: sourceId || DEFAULT_SOURCE_ID
    };
    if (hem) {
      payload.hem = hem;
    }
    const body = JSON.stringify(payload);

    return {
      callback: (cb) => {
        const ajax = dep.ajaxBuilder();
        ajax(
          url,
          {
            success: (response) => {
              try {
                const parsed = JSON.parse(response);
                const eids = parsed?.user?.eids;
                const uid = eids?.[0]?.uids?.[0];
                if (uid?.id) {
                  cb({ id: uid.id, atype: uid.atype });
                } else {
                  cb(undefined);
                }
              } catch (e) {
                cb(undefined);
              }
            },
            error: () => {
              cb(undefined);
            }
          },
          body,
          {
            method: 'POST',
            contentType: 'application/json',
            withCredentials: true
          }
        );
      }
    };
  },

  onDataDeletionRequest(config) {
    deleteStoredToken(config);
  },

  eids: {
    'acxiomRealId': (values) => {
      return values.map(data => ({
        source: DEFAULT_SOURCE_ID,
        uids: [{ id: data.id, atype: data.atype as EID['uids'][number]['atype'] }]
      }));
    }
  }
};

submodule('userId', acxiomRealIdSubmodule);

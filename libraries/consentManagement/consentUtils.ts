import { deepAccess, logWarn } from '../../src/utils.js';
import { GVL_PURPOSES, VENDORLESS_GVLID } from '../../src/consentHandler.js';

export const TCF_CMP_VERSION = 2 as const;

/**
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 * @see https://github.com/InteractiveAdvertisingBureau/iabtcf-es/tree/master/modules/core#iabtcfcore
 */
export type TCFConsentData = {
  apiVersion: typeof TCF_CMP_VERSION;
  /**
   * The consent string.
   */
  consentString: string;
  /**
   * True if GDPR is in scope.
   */
  gdprApplies: boolean;
  /**
   * The response from the CMP.
   */
  vendorData: Record<string, any>;
  /**
   * Additional consent string, if provided by the CMP.
   * @see https://support.google.com/admanager/answer/9681920?hl=en
   */
  addtlConsent?: `${number}~${string}~${string}`;
};

export type PurposeDeclarations = {
  specialFeatures?: number[];
  purposes?: number[];
  legIntPurposes?: number[];
  flexiblePurposes?: number[];
};

export const DEFAULT_PURPOSE_DECLARATION: PurposeDeclarations = {
  purposes: [1, 2, 4, 7],
  legIntPurposes: [],
  flexiblePurposes: [2],
  specialFeatures: [1]
};

export const NO_PURPOSE_DECLARATION: PurposeDeclarations = {
  purposes: [],
  legIntPurposes: [],
  flexiblePurposes: [],
  specialFeatures: []
};

const PUBLISHER_LI_PURPOSES = [2, 7, 9, 10];

const CONSENT_PATHS = {
  purpose: false,
  feature: 'specialFeatureOptins'
};

let gvlLegalBasisMapping: Record<number, PurposeDeclarations> = {};
let defaultPurposeDeclaration = NO_PURPOSE_DECLARATION;

export function setGvlLegalBasisMapping(mapping: Record<number, PurposeDeclarations>) {
  gvlLegalBasisMapping = mapping;
}

export function setDefaultPurposeDeclaration(declaration: PurposeDeclarations) {
  defaultPurposeDeclaration = declaration;
}

export function getPurposeDeclarations(gvlId) {
  if (gvlId == null) return defaultPurposeDeclaration;
  let declaration = gvlLegalBasisMapping?.[gvlId] ?? GVL_PURPOSES[gvlId];
  if (declaration == null) {
    logWarn(`No purpose declarations found for GVL ID ${gvlId}. You may set one using setConfig({gvlLegalBasisMapping}). Falling back to ${JSON.stringify(defaultPurposeDeclaration)}`);
    return defaultPurposeDeclaration;
  }
  return declaration;
}

export function getAcceptableFlags(
  consentData: TCFConsentData,
  type: 'purpose' | 'feature',
  purpose: number,
  gvlid: number,
  purposeDeclarations = getPurposeDeclarations
): {
    acceptConsent: boolean,
    acceptLI: boolean
  } {
  let acceptConsent, acceptLI;
  if (gvlid === VENDORLESS_GVLID) {
    acceptConsent = true;
    acceptLI = type === 'feature' ? false : PUBLISHER_LI_PURPOSES.includes(purpose);
  } else {
    const { purposes, legIntPurposes, flexiblePurposes, specialFeatures } = purposeDeclarations(gvlid);
    acceptLI = type === 'feature' ? false : legIntPurposes.includes(purpose) || flexiblePurposes.includes(purpose);
    acceptConsent = type === 'feature' ? specialFeatures.includes(purpose) : acceptLI || purposes.includes(purpose);
  }
  // https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20CMP%20API%20v2.md#tcdata
  //  0 - Not Allowed
  //  1 - Require Consent
  //  2 - Require Legitimate Interest
  const restriction = type === 'feature' ? null : consentData.vendorData?.publisher?.restrictions?.[purpose]?.[gvlid];
  if (restriction === 0) {
    acceptConsent = acceptLI = false;
  } else if (restriction === 1) {
    acceptLI = false;
  } else if (restriction === 2) {
    acceptConsent = false;
  }
  return { acceptConsent, acceptLI };
}

function getConsentOrLI(consentData, path, id, acceptConsent, acceptLI) {
  const data = deepAccess(consentData, `vendorData.${path}`);
  return (acceptConsent && !!data?.consents?.[id]) || (acceptLI && !!data?.legitimateInterests?.[id]);
}

export function getConsent(consentData, type, purposeNo, gvlId) {
  const { acceptConsent, acceptLI } = getAcceptableFlags(consentData, type, purposeNo, gvlId);
  let purpose;
  if (CONSENT_PATHS[type] !== false) {
    purpose = acceptConsent && !!deepAccess(consentData, `vendorData.${CONSENT_PATHS[type]}.${purposeNo}`);
  } else {
    purpose = getConsentOrLI(consentData, gvlId === VENDORLESS_GVLID ? 'publisher' : 'purpose', purposeNo, acceptConsent, acceptLI);
  }
  return {
    purpose,
    vendor: getConsentOrLI(consentData, 'vendor', gvlId, acceptConsent, acceptLI)
  };
}

export function hasVendorPurposeConsent(
  consentData: TCFConsentData | null | undefined,
  purposeNo: number,
  gvlId: number | string
): boolean {
  if (!consentData?.gdprApplies) {
    return true;
  }
  const { purpose, vendor } = getConsent(consentData, 'purpose', purposeNo, gvlId);
  return purpose && vendor;
}

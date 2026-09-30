/**
 * Consent data for the IAB TCF framework, as provided by `consentManagementTcf`.
 *
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 * @see https://github.com/InteractiveAdvertisingBureau/iabtcf-es/tree/master/modules/core#iabtcfcore
 */
export type TCFConsentData = {
  apiVersion: TCFApiVersion;
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

/**
 * The version of the TCF CMP API Prebid speaks.
 */
export type TCFApiVersion = 2;

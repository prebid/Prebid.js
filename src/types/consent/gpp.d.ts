/**
 * Consent data for the IAB GPP framework, as provided by `consentManagementGpp`.
 *
 * @see https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform
 */
export type GPPConsentData = RelevantCMPData & {
  /**
   * Everything the CMP returned, of which `RelevantCMPData` is the part Prebid uses.
   */
  gppData: RelevantCMPData & { [key: string]: unknown };
};

/**
 * The parts of a CMP's GPP response that Prebid relies on.
 */
export type RelevantCMPData = {
  applicableSections: number[];
  gppString: string;
  parsedSections: Record<string, unknown>;
};

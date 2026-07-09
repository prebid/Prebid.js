/**
 * Microsoft Clarity RTD provider parameters.
 */
export interface MsClarityRtdProviderParams {
  /**
   * Microsoft Clarity project ID. Find this in Clarity project settings.
   */
  projectId: string;
  /**
   * When `true`, load the Microsoft Clarity JavaScript tag through Prebid's
   * external-script loader. Defaults to `true`.
   */
  injectClarity?: boolean;
  /**
   * Prefix used for generated `site.keywords` entries. Defaults to `msc`.
   */
  targetingPrefix?: string;
}

export interface MsClarityRtdProviderConfig {
  /**
   * If true, delay the auction up to `auctionDelay` milliseconds to wait for
   * this provider.
   */
  waitForIt?: boolean;
  /**
   * Module-specific parameters.
   */
  params: MsClarityRtdProviderParams;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    msClarity: MsClarityRtdProviderConfig;
  }
}

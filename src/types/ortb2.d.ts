/**
 * @see https://iabtechlab.com/standards/openrtb/
 */
export namespace Ortb2 {
  type Site = {
    page?: string;
    ref?: string;
    domain?: string;
    publisher?: {
      domain?: string;
    };
    keywords?: string;
    ext?: Record<string, unknown>;
  };

  type Device = {
    w?: number;
    h?: number;
    dnt?: 0 | 1;
    ua?: string;
    language?: string;
    sua?: {
      source?: number;
      platform?: unknown;
      browsers?: unknown[];
      mobile?: number;
    };
    ext?: {
      webdriver?: true;
      [key: string]: unknown;
    };
  };

  type Regs = {
    coppa?: unknown;
    ext?: {
      gdpr?: unknown;
      us_privacy?: unknown;
      [key: string]: unknown;
    };
  };

  type User = {
    ext?: Record<string, unknown>;
  };

  /**
   * Ortb2 info provided in bidder request. Some of the sections are mutually exclusive.
   * @see clientSectionChecker
   */
  type BidRequest = {
    device?: Device;
    regs?: Regs;
    user?: User;
    site?: Site;
    app?: unknown;
    dooh?: unknown;
  };
}

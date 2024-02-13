export namespace Ortb2 {
  type Site = {
    page?: string;
    ref?: string;
    domain?: string;
    publisher?: {
      domain?: string;
    };
    keywords?: string;
  };

  type Device = {
    w?: number;
    h?: number;
    dnt?: 0 | 1;
    ua?: string;
    language: string;
    sua?: {
      source?: number;
      platform: unknown;
      browsers: unknown[];
      mobile: number;
    };
  };

  type Regs = {
    coppa?: unknown;
    ext?: { gdpr?: unknown; us_privacy?: unknown };
  };

  type User = {
    ext?: unknown;
  };

  type Ortb2Object = {
    site?: Site;
    device?: Device;
    regs?: Regs;
    user?: User;
  };
}

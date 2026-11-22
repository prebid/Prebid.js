// the augmentation in this file only applies where the spec is part of the program
import type {} from './rtdModule/spec.js';

export interface TransfonSecurityRtdProviderParams {
  /**
   * Transfon Security project license: 10 lowercase hex characters, from the
   * project's Installation page.
   */
  licenseId: string;
  /**
   * When `true`, remove all bid requests for invalid traffic and for visitors
   * matching the project's block rules. Defaults to `false`.
   */
  blockIvt?: boolean;
  /**
   * Verdict timeout in milliseconds. Defaults to `1000`.
   */
  timeout?: number;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    transfonSecurity: {
      params: TransfonSecurityRtdProviderParams;
    };
  }
}

export {};

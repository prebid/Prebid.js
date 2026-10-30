// Activate the augmentation when the RTD spec is part of the consumer's program.
import type {} from './rtdModule/spec.js';

export interface PanxoRtdProviderParams {
  /** Publisher property identifier; validated at runtime as 16 lowercase hex characters. */
  siteId: string;
  /** Use the isolated synthetic reviewer with a documented reserved siteId. Defaults to false. */
  test?: boolean;
  /** Enable additional diagnostic messages. Defaults to false. */
  verbose?: boolean;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    panxo: {
      params: PanxoRtdProviderParams;
    };
  }
}

export {};

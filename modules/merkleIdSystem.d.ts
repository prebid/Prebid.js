// the augmentation in this file only applies where the spec is part of the program
import type {} from './userId/spec.js';

export interface MerkleIdParams {
  /**
   * Publisher ID provided by Merkle. Must be a string; the module requests no ID otherwise.
   */
  sv_pubid: string;
  /**
   * SSP IDs provided by Merkle. Must be an array; the module requests no ID otherwise.
   */
  ssp_ids: string[];
  /**
   * Overrides the Merkle ID endpoint. Defaults to `https://prebid.sv.rkdms.com/identity/`.
   */
  endpoint?: string;
  /**
   * Domain sent with the request. Defaults to the page's root domain.
   */
  sv_domain?: string;
  /**
   * Session ID sent with the request. Defaults to the value of the `_svsid` cookie.
   */
  sv_session?: string;
  /**
   * How often, in seconds, a stored ID is refreshed. Defaults to 7 hours (`25200`).
   */
  refreshInSeconds?: number;
}

declare module './userId/spec' {
  interface ProviderParams {
    merkleId: MerkleIdParams;
  }
}

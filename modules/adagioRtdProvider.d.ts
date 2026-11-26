// the augmentation in this file only applies where the spec is part of the program
import type {} from './rtdModule/spec.js';

/**
 * Where the Adagio RTD module reads the `placement` value from when it is not set in
 * `bids[].adagio.params.placement` or `ortb2Imp.ext.data.adg_rtd.placement`.
 *
 * - `ortb`: `ortb2Imp.ext.data.placement` (default)
 * - `code`: the ad unit code
 * - `gpid`: `ortb2Imp.ext.gpid`
 */
export type AdagioRtdPlacementSource = 'ortb' | 'code' | 'gpid';

export interface AdagioRtdProviderParams {
  /**
   * Account ID provided by Adagio. Must be a string; the module does not initialize otherwise.
   */
  organizationId: string;
  /**
   * Account site name provided by Adagio. Must be a string; the module does not initialize otherwise.
   */
  site: string;
  /**
   * Legacy source of the `placement` value. Matched case-insensitively. Defaults to `ortb`.
   */
  placementSource?: AdagioRtdPlacementSource;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    adagio: {
      /**
       * Adagio RTD parameters. Required: the module does not initialize without
       * `organizationId` and `site`.
       */
      params: AdagioRtdProviderParams;
    }
  }
}

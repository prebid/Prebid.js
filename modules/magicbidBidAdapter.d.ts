import { BidderSpec, OrtbBannerRequest } from '../src/types.js';

export interface MagicBidParams {
  /** Publisher-specific RTB host provided by MagicBid (unique per publisher) */
  host: string;
  /** Ad Unit ID for this placement, provided by MagicBid */
  adUnitId: number;
  /** Ad format: 'banner' or 'video'. If omitted, inferred from mediaTypes. */
  adUnitType?: string;
  /** Publisher ID — required only for Prebid Server / server-side */
  publisherId?: string;
  /** Custom targeting parameter 1 */
  custom1?: string;
  /** Custom targeting parameter 2 */
  custom2?: string;
  /** Custom targeting parameter 3 */
  custom3?: string;
  /** Custom targeting parameter 4 */
  custom4?: string;
  /** Custom targeting parameter 5 */
  custom5?: string;
}

export declare const spec: BidderSpec;

declare module '../src/adUnits' {
  interface BidderParams {
    magicbid: MagicBidParams;
  }
}

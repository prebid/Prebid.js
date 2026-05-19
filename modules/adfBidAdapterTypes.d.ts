import type { Bid } from '../src/bidfactory.js';

/**
 * Common optional parameters shared by all Adf bid request configurations.
 */
interface AdfCommonParams {
  /**
   * Ad exchange domain. Defaults to `'adx.adform.net'`.
   */
  adxDomain?: string;
  /**
   * Price type for bid responses: `'net'` or `'gross'`. Defaults to `'net'`.
   */
  pt?: 'net' | 'gross';
  /**
   * @deprecated Use `pt` instead.
   */
  priceType?: 'net' | 'gross';
  [key: string]: unknown;
}

/**
 * Configuration using a master tag ID.
 */
interface AdfMidParams extends AdfCommonParams {
  /**
   * Master tag ID on the Adform platform.
   */
  mid: string | number;
  inv?: undefined;
  mname?: undefined;
}

/**
 * Configuration using an inventory source and master tag name.
 */
interface AdfInvParams extends AdfCommonParams {
  mid?: undefined;
  /**
   * Inventory source ID on the Adform platform.
   */
  inv: number;
  /**
   * Master tag name on the Adform platform.
   */
  mname: string;
}

/**
 * Bidder parameters for the Adf (Adform) adapter.
 *
 * Either `mid` or both `inv` and `mname` must be provided.
 */
export type AdfBidderParams = AdfMidParams | AdfInvParams;

declare module '../src/adUnits' {
  interface BidderParams {
    adf: AdfBidderParams;
    adform: AdfBidderParams;
    adformOpenRTB: AdfBidderParams;
  }
}

declare global {
  interface Window {
    Adform: {
      renderOutstream(bid: Bid): void;
    };
  }
}

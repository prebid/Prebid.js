import { MediaTypes } from '../../src/mediaTypes.js';

export interface VidazooBaseBidderParams {
  /**
   * The publisher ID from the Partner (pbjs only).
   */
  pId: string;
  /**
   * The connection ID from the Partner
   */
  cId: string;
  /**
   * The minimum bid value desired. Adapter will not respond with bids lower than this value
   */
  bidFloor: number;
  /**
   * Placement id on platform.
   */

  placementId?: number;
  ext?: Ext;
  /**
   * Subdomain define subdomain in the bid request URL
   */
  subDomain?: string;
}

/**
 * Bid floor value.
 */
export type Ext = {
  [key: string]: Record<string, any>;
  customParameters?: CustomParameters;
}

type CustomParameters = {
  mediaTypes?: MediaTypes
}

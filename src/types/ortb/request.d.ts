/* eslint prebid/validate-imports: 0 */

import type {Ext} from './common.d.ts';
import type {DSARequest} from "./ext/dsa.d.ts";

import type {BidRequest, Imp} from 'iab-openrtb/v26';

type TidSource = 'pbjs' | 'pbjsStable' | 'pub';

export interface ORTBRequest extends BidRequest {
  source: BidRequest['source'] & {
    ext: Ext & {
      tidSource: TidSource
    }
  }
  ext: Ext & {
    dsa?: DSARequest;
  }
}

export type ORTBImp = Imp & {
  video?: Imp['video'] & {
    // placement & sequence are deprecated in 2.6 and not in the iab-openrtb types, so we replicate them here
    /**
     * @deprecated - use plcmt instead.
     */
    placement?: number;
    /**
     * @deprecated - use slotinpod instead.
     */
    sequence?: number;
  };
  audio?: Imp['audio'],
  ext?: Ext & {
    /**
     * Transaction ID for this imp. Unique for each impression opportunity (slot & auction)
     * but common across all requests for that opportunity.
     */
    tid?: string;
    /**
     * Indicates which entity generated the TID.
     * - pbjs: Prebid generated the TID and it is bidder-specific.
     * - pbjsStable: Prebid generated the TID and it is consistent across bidders.
     * - pub: The publisher supplied the TID.
     */
    tidSource?: TidSource;
  }
};

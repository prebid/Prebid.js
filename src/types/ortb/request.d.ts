/* eslint prebid/validate-imports: 0 */

import type {Ext} from './common.d.ts';
import type {DSARequest} from "./ext/dsa.d.ts";

import type {BidRequest, Imp} from 'iab-openrtb/v26';

export interface ORTBRequest extends BidRequest {
    ext: Ext & {
        dsa?: DSARequest
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
    ext?: Ext & {
        /**
         * Transaction ID for this imp. Unique for each impression opportunity (slot & auction)
         * but common across all requests for that opportunity.
         */
        tid?: string;
    }
};

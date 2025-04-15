/* eslint prebid/validate-imports: 0 */

import type {Ext} from './common.d.ts';
import type {DSARequest} from "./ext/dsa.d.ts";

import type {BidRequest, Imp} from 'iab-openrtb/v26';

export interface ORTBRequest extends BidRequest {
    ext: Ext & {
        dsa?: DSARequest
    }
}

export type ORTBImp = Imp;

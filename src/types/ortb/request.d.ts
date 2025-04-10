import type {Ext} from './common.d.ts';
import type {DSARequest} from "./ext/dsa.d.ts";

// eslint-disable-next-line prebid/validate-imports
import type {BidRequest, Imp} from 'iab-openrtb/v26';

export interface ORTBRequest extends BidRequest {
    ext: Ext & {
        dsa?: DSARequest
    }
}

export type ORTBImp = Imp;

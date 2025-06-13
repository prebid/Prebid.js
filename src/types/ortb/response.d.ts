import type {BidResponse, SeatBid, Bid} from "iab-openrtb/v26";
import type {Ext} from './common.d.ts';
import type {DSAResponse} from "./ext/dsa.d.ts";
import type {DemandChain} from "./ext/dchain.d.ts";

export interface ORTBBid extends Bid {
    ext: Ext & {
        dsa?: DSAResponse
        dchain?: DemandChain
    }
}
export interface ORTBSeatBid extends SeatBid {
    bid: ORTBBid[];
}

export interface ORTBResponse extends BidResponse {
    seatbid?: ORTBSeatBid[];
}

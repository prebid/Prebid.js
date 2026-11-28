import type { Size } from '../src/types/common.d.ts';

/** Parameters accepted by the Adyoulike bidder adapter. */
export interface AdyoulikeBidParams {
  /** Adyoulike placement ID. */
  placement: string;
  /** Size(s) overriding `mediaTypes.banner.sizes`, as `[w, h]` or `[[w, h], ...]`. */
  size?: Size | Size[];
  /** Datacenter suffix appended to the endpoint hostname. */
  DC?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    adyoulike: AdyoulikeBidParams;
    ayl: AdyoulikeBidParams;
  }
}

import type { Size } from '../src/types/common.d.ts';
import type { RequireAtLeastOne } from '../src/types/objects.d.ts';

export interface CriteoVideoParams {
  mimes?: string[];
  playerSize?: Size | Size[];
  minduration?: number;
  maxduration?: number;
  protocols?: number[];
  api?: number[];
  skip?: 0 | 1;
  placement?: number;
  plcmt?: number;
  playbackmethod?: number[];
  startdelay?: number;
}

/** Parameters accepted by the Criteo bidder adapter. */
export type CriteoBidderParams = RequireAtLeastOne<{
  zoneId?: number | string;
  networkId?: number | string;
  publisherSubId?: number | string;
  uid?: number | string;
  pubid?: number | string;
  integrationMode?: string;
  bidFloor?: number | string;
  bidFloorCur?: string;
  video?: CriteoVideoParams;
  ext?: Record<string, unknown>;
}, 'zoneId' | 'networkId'>;

declare module '../src/adUnits' {
  interface BidderParams {
    criteo: CriteoBidderParams;
  }
}

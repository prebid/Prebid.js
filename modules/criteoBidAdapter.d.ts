import type { Size } from '../src/types/common.d.ts';

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
export interface CriteoBidderParams {
  /** Required unless `networkId` is provided. */
  zoneId?: number | string;
  /** Required unless `zoneId` is provided. */
  networkId?: number | string;
  publisherSubId?: number | string;
  uid?: number | string;
  pubid?: number | string;
  integrationMode?: string;
  bidFloor?: number | string;
  bidFloorCur?: string;
  video?: CriteoVideoParams;
  ext?: Record<string, unknown>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    criteo: CriteoBidderParams;
  }
}

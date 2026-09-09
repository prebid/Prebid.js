import type { Size } from '../src/types/common.d.ts';

export interface IxMediaParams {
  siteId?: number | string;
  [key: string]: unknown;
}

export interface IxVideoParams extends IxMediaParams {
  playerSize?: Size | Size[];
}

/** Parameters accepted by the Index Exchange bidder adapter. */
export interface IxBidderParams {
  /** Required unless `exchangeId` is configured globally. */
  siteId?: number | string;
  size?: Size;
  id?: number | string;
  tagId?: string;
  bidFloor?: number;
  bidFloorCur?: string;
  externalId?: string;
  banner?: IxMediaParams;
  video?: IxVideoParams;
  native?: IxMediaParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    ix: IxBidderParams;
  }
}

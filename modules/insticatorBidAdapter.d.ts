import type { ORTBImp, ORTBRequest } from '../src/types/ortb/request.d.ts';

type ORTBUser = NonNullable<ORTBRequest['user']>;

/** User fields added to the request's `user` object. */
export interface InsticatorUserParams {
  /** Year of birth. */
  yob?: number;
  /** Gender: `'M'`, `'F'` or `'O'`. */
  gender?: string;
  /** Comma separated keywords. */
  keywords?: string;
  /** OpenRTB `user.data` segments, appended after `ortb2.user.data`. */
  data?: ORTBUser['data'];
  /** Merged into `user.ext`, taking precedence over `ortb2.user.ext`. */
  ext?: ORTBUser['ext'];
}

/** Parameters accepted by the Insticator bidder adapter. */
export interface InsticatorBidParams {
  /** Ad unit ID provided by Insticator. */
  adUnitId: string;
  /** Publisher ID provided by Insticator; sent as `site.publisher.id` and as a query parameter. */
  publisherId?: string;
  /** User fields. */
  user?: InsticatorUserParams;
  /** Overrides the bid request URL (read from the first bid of the request). */
  bid_endpoint_request_url?: string;
  /** Bid floor, sent as `imp.bidfloor`. */
  floor?: number;
  /** Currency of `floor`; only `'USD'` is supported (any other value drops the floor). */
  bidfloorcur?: string;
  /** OpenRTB video fields, merged over the ones taken from `mediaTypes.video`; invalid values are dropped. */
  video?: Partial<NonNullable<ORTBImp['video']>>;
  /** OpenRTB audio fields, merged over the ones taken from `mediaTypes.audio`; invalid values are dropped. */
  audio?: Partial<NonNullable<ORTBImp['audio']>>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    insticator: InsticatorBidParams;
  }
}

import type { ORTBImp } from '../src/types/ortb/request.d.ts';

type ORTBVideo = NonNullable<ORTBImp['video']>;

/** Video fields. Each one overrides the same field on `mediaTypes.video`. */
export type SmartxVideoParams = Partial<Pick<ORTBVideo,
  'mimes' | 'linearity' | 'minduration' | 'maxduration' | 'startdelay' | 'minbitrate' | 'maxbitrate' |
  'delivery' | 'pos' | 'api' | 'protocols' | 'plcmt' | 'skip' | 'skipmin' | 'skipafter' | 'battr' |
  'playbackend' | 'playbackmethod'>>;

/** Options for the smartx outstream renderer. */
export interface SmartxOutstreamOptions {
  /** ID of the element the ad is rendered into. Required for outstream ad units. */
  slot: string;
  /** No ad is requested when the visible area is narrower than this, in pixels. */
  minAdWidth?: number;
  /** Maximum player width in pixels. */
  maxAdWidth?: number;
  /** Text shown by the player; `[remainingTime]` is replaced with the remaining seconds. */
  title?: string;
  /** Seconds before the skip button shows. */
  skipOffset?: number;
  /** `'false'` starts collapsed and expands once the player is in view. */
  startOpen?: 'true' | 'false';
  /** `'false'` collapses the player when the ad ends instead of showing the ending screen. */
  endingScreen?: 'true' | 'false';
  /** Target bitrate of the creative in kbps. */
  desiredBitrate?: number;
  /** Percentage of the player that has to be visible to play. */
  visibilityThreshold?: number;
}

export type SmartxBidderParams = SmartxVideoParams & {
  /** Tag ID, provided by smartclip. */
  tagId: string;
  /** Publisher ID, provided by smartclip. */
  publisherId: string;
  /** Site ID, or app ID for app requests, provided by smartclip. */
  siteId: string;
  /** Bid floor. When not set, the Price Floors module is asked. */
  bidfloor?: number;
  /** Currency of the bid floor. Defaults to `'EUR'`. */
  bidfloorcur?: string;
  /** Sitekey provided by smartclip, sent as `content.ext.sitekey`. */
  sitekey?: string;
  /** Sent as `site.domain`. Not used in app requests. */
  domain?: string;
  /** IAB categories, sent as `site.cat`. Not used in app requests. */
  cat?: string[];
  /** Force a secure request on a non-secure page. */
  secure?: boolean;
  /** Auction type. Defaults to `2`. */
  at?: number;
  /** Accepted currencies. Defaults to `['EUR']`. */
  cur?: string[];
  /** Outstream renderer options. Required when `mediaTypes.video.context` is `'outstream'`. */
  outstream_options?: SmartxOutstreamOptions;
  /** Passed to the outstream renderer config as `ad_mute`. */
  ad_mute?: boolean;
  /** Passed to the outstream renderer config as `hide_skin`. */
  hide_skin?: boolean;
  /** Targeting segments, sent as `user.data` (first segment value per entry). */
  user?: {
    data?: {
      id?: string;
      name: string;
      segment: { id?: string; name?: string; value: string }[];
    }[];
  };
  /** Overrides price and currency of a response bid whose `id` equals `deal_id`. */
  pre_market_bids?: {
    deal_id: string;
    price: number;
    currency: string;
  }[];
  /** Older docs listed params the adapter never read (`price_floor`, `min_duration`, ...); configs copied from them still compile. */
  [key: string]: unknown;
};

declare module '../src/adUnits' {
  interface BidderParams {
    smartx: SmartxBidderParams;
  }
}

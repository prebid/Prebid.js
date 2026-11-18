import type { ORTBRequest } from '../src/types/ortb/request.d.ts';

type ORTBPublisher = NonNullable<NonNullable<ORTBRequest['site']>['publisher']>;

/** Publisher object, sent as `site.publisher`. */
export type OutbrainPublisher = ORTBPublisher & {
  /** Outbrain publisher account ID. */
  id: string;
  /** Publisher name. */
  name?: string;
  /** Publisher domain. */
  domain?: string;
};

/** Parameters accepted by the Outbrain bidder adapter. */
export interface OutbrainBidParams {
  /** Publisher; `publisher.id` is required. */
  publisher: OutbrainPublisher;
  /** Identifier for a specific ad placement or tag, sent as `imp.tagid`. */
  tagid?: string;
  /**
   * Blocked advertiser categories (IAB); used when `ortb2.bcat` is not set.
   * @deprecated Use `ortb2.bcat`.
   */
  bcat?: string[];
  /**
   * Blocked advertiser domains; used when `ortb2.badv` is not set.
   * @deprecated Use `ortb2.badv`.
   */
  badv?: string[];
  /** Mark the request as a test (sets `test: 1` and `is_debug`). */
  test?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    outbrain: OutbrainBidParams;
  }
}

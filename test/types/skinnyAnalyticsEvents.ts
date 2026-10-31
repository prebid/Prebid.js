/**
 * Compile-time contract checks for the generic analytics skinny preset.
 * These check the public discriminated union, not the full input event args.
 */
import type {
  SkinnyEventPayload,
  SkinnyEventPayloads,
  SkinnyEventType,
  SkinnyNoBid,
  SkinnyBidResponse,
  SkinnyBidWon,
  SkinnyBidRequested,
  SkinnyBidTimeout,
  SkinnyBidRequestFields,
  SkinnyTimedOutBidderRequest
} from '../../modules/genericAnalyticsSkinnyEvents.ts';

import type { ORTBRequest, ORTBImp } from '../../src/types/ortb/request.d.ts';
import type { DeepPartial } from '../../src/types/objects.d.ts';

type Assert<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

export type AllFiveEvents = Assert<Equal<
  SkinnyEventType, 'noBid' | 'bidResponse' | 'bidWon' | 'bidRequested' | 'bidTimeout'
>>;

export type MapPayloads = Assert<Equal<
  SkinnyEventPayloads,
  {
    noBid: SkinnyNoBid;
    bidResponse: SkinnyBidResponse;
    bidWon: SkinnyBidWon;
    bidRequested: SkinnyBidRequested;
    bidTimeout: SkinnyBidTimeout;
  }
>>;


export type StoredImpressionBidRequestedCode = Assert<Equal<
  SkinnyBidRequested['bidderCode'], string | null
>>;

export type StoredImpressionTimedOutCode = Assert<Equal<
  SkinnyTimedOutBidderRequest['bidderCode'], string | null
>>;

export type StoredImpressionNestedBidCode = Assert<Equal<
  SkinnyBidRequestFields['bidder'], string | null
>>;

export type StoredImpressionNoBidCode = Assert<Equal<
  SkinnyNoBid['bidder'], string | null
>>;

export type DiscriminatedUnion = Assert<Equal<
  Extract<SkinnyEventPayload, { eventType: 'bidWon' }>, SkinnyBidWon
>>;

/**
 * These assertions make the shared Prebid OpenRTB 2.6 types the source of
 * truth for nested skinny payloads. The hand-maintained JSON Schema is a
 * wire-format validator, not a replacement for OpenRTB type checking.
 */
export type BidRequestedUsesOpenRTB = Assert<Equal<
  SkinnyBidRequested['ortb2'], DeepPartial<ORTBRequest>
>>;

export type TimeoutUsesOpenRTB = Assert<Equal<
  SkinnyTimedOutBidderRequest['ortb2'], DeepPartial<ORTBRequest>
>>;

export type BidRequestUsesOpenRTBImp = Assert<Equal<
  NonNullable<SkinnyBidRequestFields['ortb2Imp']>, DeepPartial<ORTBImp>
>>;

// These compile-time errors must keep firing if the nested fields retain
// their shared OpenRTB types rather than being broadened to any or unknown.
export const invalidOrtb2: SkinnyBidRequested['ortb2'] = {
  site: {
    // @ts-expect-error - OpenRTB site.domain is a string
    domain: 123
  }
};

export const invalidOrtb2Imp: SkinnyBidRequestFields['ortb2Imp'] = {
  banner: {
    // @ts-expect-error - OpenRTB banner.w is a number
    w: '300'
  }
};

export function narrowPayload(payload: SkinnyEventPayload) {
  if (payload.eventType === 'bidTimeout') {
    const requests: SkinnyBidTimeout['bidderRequests'] = payload.bidderRequests;
    return requests;
  }
  if (payload.eventType === 'noBid') {
    return payload.bidId;
  }
  // @ts-expect-error - a bid response does not expose grouped timeout requests
  return payload.bidderRequests;
}

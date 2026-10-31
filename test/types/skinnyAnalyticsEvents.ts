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
  SkinnyBidTimeout
} from '../../modules/genericAnalyticsSkinnyEvents.ts';

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

export type DiscriminatedUnion = Assert<Equal<
  Extract<SkinnyEventPayload, { eventType: 'bidWon' }>, SkinnyBidWon
>>;

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

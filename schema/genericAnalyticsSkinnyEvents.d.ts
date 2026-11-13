import type * as S from '../modules/genericAnalyticsSkinnyEvents.ts'
import type OpenRTBRequest from './ortb2/request.d.ts'
import type OpenRTBImp from './ortb2/imp.d.ts'
import type { Override, Serialized } from './helpers.d.ts'
import type { DefaultTargeting } from '../src/auction.ts'

// stands in for TargetingMap<unknown>: the generator does not resolve generic parameters in index signatures
export interface AdserverTargeting extends Partial<DefaultTargeting> {
  [key: string]: unknown;
}

/** @additionalProperties false */
export interface SkinnyBidRequest extends Override<S.SkinnyBidRequestFields, { ortb2Imp?: OpenRTBImp }> {}
/** @additionalProperties false */
export interface SkinnyNoBid extends Serialized<S.SkinnyNoBid> {}
/** @additionalProperties false */
export interface SkinnyBidResponse extends Override<S.SkinnyBidResponse, { adserverTargeting?: AdserverTargeting }> {}
/** @additionalProperties false */
export interface SkinnyBidWon extends Override<S.SkinnyBidWon, { adserverTargeting?: AdserverTargeting }> {}
/** @additionalProperties false */
export interface SkinnyBidClick extends Serialized<S.SkinnyBidClick> {}
/** @additionalProperties false */
export interface SkinnyBidClickInferred extends Serialized<S.SkinnyBidClickInferred> {}
/** @additionalProperties false */
export interface SkinnyBidRequested extends Override<S.SkinnyBidRequested, { ortb2: OpenRTBRequest; bids: SkinnyBidRequest[] }> {}
/** @additionalProperties false */
export interface SkinnyTimedOutBidderRequest extends Override<S.SkinnyTimedOutBidderRequest, { ortb2: OpenRTBRequest; bids: SkinnyBidRequest[] }> {}
/** @additionalProperties false */
export interface SkinnyBidTimeout extends Override<S.SkinnyBidTimeout, { bidderRequests: SkinnyTimedOutBidderRequest[] }> {}

/** Event payloads sent by the generic analytics adapter with `preset: 'skinny'`. */
export type SkinnyEvent = SkinnyNoBid | SkinnyBidResponse | SkinnyBidWon | SkinnyBidClick | SkinnyBidClickInferred | SkinnyBidRequested | SkinnyBidTimeout
// fails to compile when the preset sends an event type that SkinnyEvent leaves out
type Covered<T extends SkinnyEvent['eventType']> = T
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AllEventTypesCovered = Covered<S.SkinnyEventType>
export type { SkinnyEvent as default }

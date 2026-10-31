import type { AdmixerRtbBidderParams } from '../../modules/admixerBidAdapter.js';
import type { AdUnitBidderBid, BidderParams } from '../../src/adUnits.js';

type Assert<T extends true> = T;
export type AditgenIsTyped = Assert<'aditgen' extends keyof BidderParams ? true : false>;
export type AditgenUsesRtbParams = Assert<AdUnitBidderBid<'aditgen'>['params'] extends AdmixerRtbBidderParams ? true : false>;
export const aditgen: AdUnitBidderBid<'aditgen'> = { bidder: 'aditgen', params: { tagId: 41512, bidFloor: 0.5 } };
export const stringTagId: AdmixerRtbBidderParams = { tagId: '41512' };
// @ts-expect-error - tagId is required
export const missingTagId: AdUnitBidderBid<'aditgen'> = { bidder: 'aditgen', params: { zone: 'abc' } };
// @ts-expect-error - bidFloor is a number
export const stringFloor: AdmixerRtbBidderParams = { tagId: 1, bidFloor: '0.5' };

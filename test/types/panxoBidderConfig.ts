import type { PanxoBidderParams } from '../../modules/panxoBidAdapter.d.ts';
import type { AdUnitBidderBid, BidderParams } from '../../src/adUnits.ts';

type Assert<T extends true> = T;
export type PanxoIsTyped = Assert<'panxo' extends keyof BidderParams ? true : false>;

export const minimal: AdUnitBidderBid<'panxo'> = {
  bidder: 'panxo', params: { propertyKey: 'synthetic-property' }
};
export const withFloor: AdUnitBidderBid<'panxo'> = {
  bidder: 'panxo', params: { propertyKey: 'synthetic-property', floor: 0.5 }
};
export const directPublicParams: PanxoBidderParams = { propertyKey: 'synthetic-property', floor: 0 };

// @ts-expect-error propertyKey is required
export const missingProperty: AdUnitBidderBid<'panxo'> = { bidder: 'panxo', params: {} };
// @ts-expect-error propertyKey is a string
export const numericProperty: AdUnitBidderBid<'panxo'> = { bidder: 'panxo', params: { propertyKey: 123 } };
// @ts-expect-error floor is numeric
export const stringFloor: AdUnitBidderBid<'panxo'> = { bidder: 'panxo', params: { propertyKey: 'synthetic', floor: '0.5' } };
// @ts-expect-error siteId is not a bidder parameter (it belongs to RTD)
export const wrongModuleParam: AdUnitBidderBid<'panxo'> = { bidder: 'panxo', params: { propertyKey: 'synthetic', siteId: 'wrong-module' } };

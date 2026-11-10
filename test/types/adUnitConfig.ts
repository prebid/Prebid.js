/** Compile-time checks for bidder-name inference in ad unit definitions. */
import type { PrebidJS } from '../../src/prebidGlobal.ts';
import type { AdUnitBidDefinition, AdUnitDefinition, BidderParams } from '../../src/adUnits.ts';

type Assert<T extends true> = T;
export type AdapexIsTyped = Assert<'adapex' extends keyof BidderParams ? true : false>;
export type AppnexusAliasIsTyped = Assert<'appnexusAst' extends keyof BidderParams ? true : false>;

export const definition: AdUnitDefinition<'adapex'> = { code: 'slot', bids: [{ bidder: 'adapex', params: { seat: 'publisher' } }] };
export const customBid: AdUnitBidDefinition<'adapex' | 'custom'> = { bidder: 'custom', params: { anything: true } };

// @ts-expect-error - an explicit definition checks the declared bidder's parameters
export const invalidDefinition: AdUnitDefinition<'adapex'> = { code: 'slot', bids: [{ bidder: 'adapex', params: { seat: 42 } }] };
// @ts-expect-error - a union of bidder names keeps each bidder's own params
export const invalidBid: AdUnitBidDefinition<'adapex' | 'custom'> = { bidder: 'adapex', params: { seat: 42 } };

export function checkAdUnits(pbjs: PrebidJS, dynamicBidder: string, existing: AdUnitDefinition[]) {
  pbjs.addAdUnits(definition);
  pbjs.addAdUnits({ code: 'slot', bids: [{ bidder: 'adapex', params: { seat: 'publisher' } }] });
  pbjs.addAdUnits([
    { code: 'first', bids: [{ bidder: 'adapex', params: { seat: 'publisher' } }, customBid] },
    { code: 'second', bids: [{ bidder: 'appnexusAst', params: { placementId: 1 } }, { module: 'pbsBidAdapter', params: { configName: 'stored' } }] }
  ]);
  pbjs.addAdUnits({ code: 'dynamic', bids: [{ bidder: dynamicBidder, params: { anything: true } }] });
  pbjs.addAdUnits(existing);
  pbjs.addAdUnits({ code: 'unionParams', bids: [{ bidder: 'adf', params: { mid: 1 } }, { bidder: 'adf', params: { inv: 1, mname: 'tag' } }] });
  pbjs.requestBids({ adUnits: existing });
  pbjs.requestBids({ adUnits: [{ code: 'slot', bids: [{ bidder: 'adapex', params: { seat: 'publisher' } }, { bidder: 'customAlias', params: { anything: true } }] }] });
  pbjs.requestBids({ adUnits: [{ code: 'stored', bids: [{ module: 'pbsBidAdapter' }] }] });
  pbjs.requestBids();
  pbjs.requestBids({ timeout: 500 });

  // @ts-expect-error - known bidders cannot fall back to the untyped branch
  pbjs.addAdUnits({ code: 'slot', bids: [{ bidder: 'adapex', params: { seat: 42 } }] });
  // @ts-expect-error - a known bidder's required parameter must be present
  pbjs.addAdUnits({ code: 'slot', bids: [{ bidder: 'adapex', params: {} }] });
  // @ts-expect-error - known bidders still require a params object
  pbjs.addAdUnits({ code: 'slot', bids: [{ bidder: 'adapex' }] });
  // @ts-expect-error - excess parameters are checked alongside a custom bidder
  pbjs.addAdUnits({ code: 'slot', bids: [{ bidder: 'custom', params: { anything: true } }, { bidder: 'adapex', params: { seat: 'publisher', bogus: true } }] });
  // @ts-expect-error - parameters from another typed bidder do not satisfy adapex
  pbjs.addAdUnits([{ code: 'slot', bids: [{ bidder: 'appnexus', params: { placementId: 1 } }, { bidder: 'adapex', params: { placementId: 1 } }] }]);
  // @ts-expect-error - inference also covers different bidders in different ad units
  pbjs.addAdUnits([{ code: 'first', bids: [{ bidder: 'custom', params: {} }] }, { code: 'second', bids: [{ bidder: 'adapex', params: { seat: false } }] }]);
  // @ts-expect-error - declared aliases retain the original bidder's parameter types
  pbjs.addAdUnits({ code: 'slot', bids: [{ bidder: 'appnexusAst', params: { placementId: true } }] });
  // @ts-expect-error - requesting ad units validates bidder params too
  pbjs.requestBids({ adUnits: [{ code: 'slot', bids: [{ bidder: 'adapex', params: { seat: 42 } }] }] });
  // @ts-expect-error - a custom alias does not weaken a typed bidder in requestBids
  pbjs.requestBids({ adUnits: [{ code: 'slot', bids: [{ bidder: 'customAlias', params: {} }, { bidder: 'adapex', params: { seat: 'publisher', bogus: true } }] }] });
  // @ts-expect-error - module bids preserve their own parameter types
  pbjs.addAdUnits({ code: 'slot', bids: [{ module: 'pbsBidAdapter', params: { configName: 42 } }] });
  // @ts-expect-error - a bidder's union parameter type retains its mutually exclusive alternatives
  pbjs.addAdUnits({ code: 'slot', bids: [{ bidder: 'adf', params: { mid: 1, inv: 1, mname: 'tag' } }] });

  // Ad units built before the call: naming their bidders in the type checks them as if they were inline (README)
  const prebuilt = [
    { code: 'slot', bids: [{ bidder: 'adapex', params: { seat: 'publisher' } }, { bidder: 'custom', params: { anything: true } }] }
  ] satisfies AdUnitDefinition<'adapex' | 'custom'>[];
  pbjs.addAdUnits(prebuilt);
  pbjs.requestBids({ adUnits: prebuilt });
  // @ts-expect-error - prebuilt ad units that name their bidders are checked
  const invalidPrebuilt = [{ code: 'slot', bids: [{ bidder: 'adapex', params: { seat: 42 } }] }] satisfies AdUnitDefinition<'adapex'>[];
  return invalidPrebuilt;
}

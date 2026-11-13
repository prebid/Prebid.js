/** Compile-only fixtures, checked by `gulp ts` and under strictFunctionTypes by the consumer fixture. */
import type { PrebidJS } from '../../src/prebidGlobal.ts';
import type { BidderScopedSettings, BidderSettingsMap } from '../../src/bidderSettings.ts';

declare function expectType<T>(value: T): void;

export const scopedSettings: BidderScopedSettings<'adapex'> = {
  bidCpmAdjustment(cpm, _bid, request) {
    expectType<'adapex'>(request.bidder);
    expectType<string>(request.params.seat);
    // @ts-expect-error - the bidder's declared params are checked in callbacks
    expectType<unknown>(request.params.placementId);
    return cpm;
  }
};

export const settings: BidderSettingsMap = {
  standard: { storageAllowed: false },
  adapex: {
    ...scopedSettings,
    bidDesirabilityAdjustment(cpm, _bid, request) {
      expectType<string>(request.params.seat);
      return cpm;
    },
    adserverTargeting: [{ key: 'seat', val: (_bid, request) => request.params.seat }]
  },
  custom: {
    bidCpmAdjustment(cpm, _bid, request) {
      expectType<unknown>(request.params.anything);
      // @ts-expect-error - undeclared custom parameters remain unknown rather than any
      expectType<string>(request.params.anything);
      return cpm;
    }
  }
};

export function assignSettings(pbjs: PrebidJS) {
  pbjs.bidderSettings = settings;
}

export function checkBidderSettings(pbjs: PrebidJS) {
  pbjs.bidderSettings = {
    appnexus: {
      bidCpmAdjustment(cpm, _bid, request) {
        expectType<'appnexus'>(request.bidder);
        expectType<number | string | undefined>(request.params.placementId);
        // @ts-expect-error - callback inference uses appnexus parameters
        expectType<unknown>(request.params.seat);
        return cpm;
      }
    }
  };
  pbjs.bidderSettings.adapex = scopedSettings;
}

// @ts-expect-error - shared settings keep their declared value types
export const invalidStorageAllowed: PrebidJS['bidderSettings'] = { custom: { storageAllowed: 'invalid' } };
// @ts-expect-error - known bidder settings reject unknown settings
export const invalidSetting: PrebidJS['bidderSettings'] = { adapex: { bogus: true } };

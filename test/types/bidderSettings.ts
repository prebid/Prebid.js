/** Checked as source by `gulp ts`, and under strictFunctionTypes by the consumer fixture. */
import type { PrebidJS } from '../../src/prebidGlobal.ts';
import type { BidderScopedSettings, BidderSettingsMap } from '../../src/bidderSettings.ts';

export const scopedSettings: BidderScopedSettings<'adapex'> = {
  bidCpmAdjustment(cpm, _bid, request) {
    const code: 'adapex' = request.bidder;
    const seat: string = request.params.seat;
    // @ts-expect-error - the bidder's declared params are checked in callbacks
    String(request.params.placementId);
    return code && seat ? cpm : 0;
  }
};

export const settings: BidderSettingsMap = {
  standard: { storageAllowed: false },
  adapex: {
    ...scopedSettings,
    bidDesirabilityAdjustment(cpm, _bid, request) {
      const seat: string = request.params.seat;
      return seat ? cpm : 0;
    },
    adserverTargeting: [{ key: 'seat', val: (_bid, request) => request.params.seat }]
  },
  custom: {
    bidCpmAdjustment(cpm, _bid, request) {
      const anything: unknown = request.params.anything;
      // @ts-expect-error - undeclared custom parameters remain unknown rather than any
      const wrong: string = request.params.anything;
      return anything === wrong ? 0 : cpm;
    }
  }
};

export function checkBidderSettings(pbjs: PrebidJS) {
  pbjs.bidderSettings = settings;
  pbjs.bidderSettings = {
    appnexus: {
      bidCpmAdjustment(cpm, _bid, request) {
        const code: 'appnexus' = request.bidder;
        const placement: number | string | undefined = request.params.placementId;
        // @ts-expect-error - callback inference uses appnexus parameters
        String(request.params.seat);
        return code && placement ? cpm : 0;
      }
    }
  };
  pbjs.bidderSettings.adapex = scopedSettings;
  // @ts-expect-error - shared settings keep their declared value types
  pbjs.bidderSettings = { custom: { storageAllowed: 'invalid' } };
  // @ts-expect-error - known bidder settings reject unknown settings
  pbjs.bidderSettings = { adapex: { bogus: true } };
}

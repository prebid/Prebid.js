import { isPlainObject } from '../../../src/utils.js';
import type { DealMeta } from '../../../src/bidfactory.ts';
import type { ORTBBid } from '../../../src/types/ortb/response.d.ts';
import type { Currency } from '../../../src/types/common.d.ts';

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isCurrencyCode(value: unknown): value is Currency {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

/**
 * Normalize ORTB `bid.ext.prebid.deal` into the shape used for `bidResponse.meta.deal`.
 * Only known, correctly typed fields are copied. Deal metadata is ignored unless the bid has a `dealid`.
 * @param bid - ORTB bid object.
 * @param currency - currency of the bid response, used for deal CPMs that do not specify their own.
 * @returns the normalized deal metadata, or undefined if there is none.
 */
export function getDealMeta(bid: ORTBBid, currency?: Currency): DealMeta | undefined {
  const deal = bid.ext?.prebid?.deal;
  if (!bid.dealid || !isPlainObject(deal)) {
    return;
  }
  const dealMeta: DealMeta = {
    type: Number.isInteger(deal.type) ? deal.type : 0
  };
  if (isNonNegativeNumber(deal.cpm)) {
    dealMeta.cpm = deal.cpm;
    const cpmCurrency = isCurrencyCode(deal.cpm_cur) ? deal.cpm_cur : currency;
    if (cpmCurrency) {
      dealMeta.cpmCurrency = cpmCurrency;
    }
  }
  if (isNonNegativeNumber(deal.pacing_adjusted_cpm)) {
    dealMeta.pacingAdjustedCpm = deal.pacing_adjusted_cpm;
    const pacingAdjustedCpmCurrency = isCurrencyCode(deal.pacing_adjusted_cpm_cur) ? deal.pacing_adjusted_cpm_cur : currency;
    if (pacingAdjustedCpmCurrency) {
      dealMeta.pacingAdjustedCpmCurrency = pacingAdjustedCpmCurrency;
    }
  }
  if (isNonNegativeNumber(deal.on_schedule)) {
    dealMeta.onSchedule = deal.on_schedule;
  }
  if (Number.isInteger(deal.priority)) {
    dealMeta.priority = deal.priority;
  }
  return dealMeta;
}

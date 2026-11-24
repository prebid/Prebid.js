import { isPlainObject } from '../../../src/utils.js';
import type { DealMeta, TakeoverMeta } from '../../../src/bidfactory.ts';
import type { ORTBBid } from '../../../src/types/ortb/response.d.ts';
import type { TakeoverExt } from '../../../src/types/ortb/ext/deal.d.ts';

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

const TAKEOVER_MODES = ['all', 'max', 'viewport'];

function nonEmptyStrings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return;
  const strings = value.filter(item => typeof item === 'string' && item !== '');
  return strings.length > 0 ? strings : undefined;
}

function getTakeoverMeta(takeover: TakeoverExt | undefined): TakeoverMeta | undefined {
  if (!isPlainObject(takeover)) {
    return;
  }
  const { mode, min_slots: minSlots, exclusivity } = takeover;
  const takeoverMeta: TakeoverMeta = {
    mode: TAKEOVER_MODES.includes(mode) ? mode as TakeoverMeta['mode'] : 'max'
  };
  if (Number.isInteger(minSlots) && minSlots > 0) {
    takeoverMeta.minSlots = minSlots;
  }
  if (isPlainObject(exclusivity)) {
    const adomain = nonEmptyStrings(exclusivity.adomain);
    const cat = nonEmptyStrings(exclusivity.cat);
    if (adomain || cat) {
      takeoverMeta.exclusivity = {
        ...(adomain && { adomain }),
        ...(cat && { cat })
      };
    }
  }
  return takeoverMeta;
}

/**
 * Normalize ORTB `bid.ext.prebid.deal` into the shape used for `bidResponse.meta.deal`.
 * Only known, correctly typed fields are copied. Deal metadata is ignored unless the bid has a `dealid`.
 * @param bid - ORTB bid object.
 * @returns the normalized deal metadata, or undefined if there is none.
 */
export function getDealMeta(bid: ORTBBid): DealMeta | undefined {
  const deal = bid.ext?.prebid?.deal;
  if (!bid.dealid || !isPlainObject(deal)) {
    return;
  }
  const dealMeta: DealMeta = {
    type: Number.isInteger(deal.type) ? deal.type : 0
  };
  if (isNonNegativeNumber(deal.cpm)) {
    dealMeta.cpm = deal.cpm;
  }
  if (isNonNegativeNumber(deal.priority_adjusted_cpm)) {
    dealMeta.priorityAdjustedCpm = deal.priority_adjusted_cpm;
  }
  if (isNonNegativeNumber(deal.on_schedule)) {
    dealMeta.onSchedule = deal.on_schedule;
  }
  if (Number.isInteger(deal.priority)) {
    dealMeta.priority = deal.priority;
  }
  if (typeof deal.source === 'string' && deal.source !== '') {
    dealMeta.source = deal.source;
  }
  const takeover = getTakeoverMeta(deal.takeover);
  if (takeover) {
    dealMeta.takeover = takeover;
  }
  return dealMeta;
}

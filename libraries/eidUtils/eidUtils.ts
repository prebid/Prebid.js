import { auctionManager } from '../../src/auctionManager.js';
import { isActivityAllowed } from '../../src/activities/rules.js';
import { ACTIVITY_TRANSMIT_EIDS } from '../../src/activities/activities.js';
import { activityParams } from '../../src/activities/activityParams.js';
import { MODULE_TYPE_ANALYTICS } from '../../src/activities/modules.js';
import type { BidRequest } from '../../src/adapterManager.ts';

type ORTB2 = BidRequest<any>['ortb2'];

function getEids(ortb2: ORTB2): any[] {
  const user: any = ortb2?.user;
  return [...(user?.eids ?? []), ...(user?.ext?.eids ?? [])];
}

/**
 * List of unique sources across the EIDs in `ortb2.user` (both `user.eids` and `user.ext.eids`).
 */
export function eidsSources(ortb2: ORTB2): string[] {
  return [...new Set(getEids(ortb2).map(eid => eid?.source).filter(source => source != null))] as string[];
}

/**
 * The first ID (`uids[0].id`) of the first EID in `ortb2.user` (`user.eids` or `user.ext.eids`) with the given source.
 */
export function eidValue(ortb2: ORTB2, source: string): string | undefined {
  const id = getEids(ortb2).find(eid => eid?.source === source)?.uids?.[0]?.id;
  return id == null ? undefined : id;
}

/**
 * The global first party data of an auction (where the User ID module puts EIDs that are not restricted to specific bidders),
 * for an analytics adapter to read EIDs from.
 *
 * Returns undefined if the auction is not found, or if the `transmitEids` activity is denied to the analytics adapter.
 *
 * @param auctionId auction ID
 * @param analyticsCode the code the analytics adapter is registered with
 */
export function analyticsAuctionOrtb2(auctionId: string, analyticsCode: string): ORTB2 | undefined {
  if (!isActivityAllowed(ACTIVITY_TRANSMIT_EIDS, activityParams(MODULE_TYPE_ANALYTICS, analyticsCode))) {
    return undefined;
  }
  return auctionManager.index.getAuction({ auctionId })?.getFPD()?.global as ORTB2;
}

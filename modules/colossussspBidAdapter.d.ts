import type { RequireAtLeastOne } from '../src/types/objects.d.ts';

/** Parameters accepted by the Colossus SSP bidder adapter: `placement_id` or `group_id` is required. */
export type ColossussspBidParams = RequireAtLeastOne<{
  /** Placement ID from the Colossus SSP platform; must be numeric. */
  placement_id?: number | string;
  /** Group ID from the Colossus SSP platform, used instead of `placement_id`; must be numeric. */
  group_id?: number | string;
}, 'placement_id' | 'group_id'>;

declare module '../src/adUnits' {
  interface BidderParams {
    colossusssp: ColossussspBidParams;
  }
}

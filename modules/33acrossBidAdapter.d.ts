import type { ORTBImp } from '../src/types/ortb/request.d.ts';
import type { Size } from '../src/types/common.d.ts';
import type { RequireAtLeastOne } from '../src/types/objects.d.ts';

type ORTBVideo = NonNullable<ORTBImp['video']>;

/** Video settings; merged over `mediaTypes.video`. Only the OpenRTB fields the adapter forwards end up in `imp.video`. */
export type ThirtyThreeAcrossVideoParams = Partial<ORTBVideo> & {
  /** Player size, overriding `mediaTypes.video.playerSize`; a list of `[width, height]` (the first is used). */
  playerSize?: Size[];
};

interface ThirtyThreeAcrossBidParamsBase {
  /** 33Across product: `'siab'` (banner or outstream video), `'inview'` (adhesion) or `'instream'` (instream video). Inferred when not set. */
  productId?: 'siab' | 'inview' | 'instream';
  /** Set to `1` to send test requests. Only read from the first bid of a request. */
  test?: number;
  /** Video settings. */
  video?: ThirtyThreeAcrossVideoParams;
}

/** Parameters accepted by the 33Across bidder adapter: `zoneId` (or the legacy `siteId`) is required. */
export type ThirtyThreeAcrossBidParams = RequireAtLeastOne<ThirtyThreeAcrossBidParamsBase & {
  /** 33Across publisher GUID (22 characters: letters, digits, `_` or `-`). */
  zoneId?: string;
  /** @deprecated Use `zoneId`. */
  siteId?: string;
}, 'zoneId' | 'siteId'>;

declare module '../src/adUnits' {
  interface BidderParams {
    '33across': ThirtyThreeAcrossBidParams;
    '33across_mgni': ThirtyThreeAcrossBidParams;
  }
}

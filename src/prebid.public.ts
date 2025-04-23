export {default} from './prebid.ts';
export type {PrebidJS} from './prebidGlobal.ts';
export type {Bid, VideoBid, BannerBid, NativeBid} from './bidfactory.ts';

// a ts file importing other ts files (and so on) picks up type declarations along the way,
// but a ts file importing js importing ts does not.
// these imports should no longer be needed once they can be reached all the way from prebid.ts
// through only ts files.

/* eslint-disable import-x/first */
import './auction.ts';
import './videoCache.ts';



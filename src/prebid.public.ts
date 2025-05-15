export {default} from './prebid.ts';
export type {PrebidJS} from './prebidGlobal.ts';
export type {Bid, VideoBid, BannerBid, NativeBid} from './bidfactory.ts';

// a ts file importing types from other ts files picks up type declarations along the way,
// but importing just real code does not. These imports are to include various "declare modules"
// from files that (currently) do not export types used anywhere else.
// TODO: autogenerate this as part of precompilation

/* eslint-disable import-x/first */
import './auction.ts';
import './videoCache.ts';
import './adRendering.ts';



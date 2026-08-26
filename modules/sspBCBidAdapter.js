// Backward-compat entry point: sspBC was consolidated into goplBidAdapter.js and is now
// registered as an alias of `gopl`. Kept so publishers building with
// --modules=sspBCBidAdapter still get a working bundle.
export { spec, storage } from './goplBidAdapter.js'; // eslint-disable-line prebid/validate-imports

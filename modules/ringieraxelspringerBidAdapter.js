/**
 * Backward-compatibility shim for ringieraxelspringer bidder.
 * This bidder has been renamed to 'das'.
 *
 * This file will be removed in Prebid 11.
 * See dasBidAdapter.js for implementation.
 */
export { spec } from './dasBidAdapter.js'; // eslint-disable-line prebid/validate-imports

// This file exists for backwards compatibility only.
// The adapter has been renamed to showheroesBidAdapter.
// Please update your build configuration to use showheroesBidAdapter instead.
// This file will be removed in a future release.
import { spec as newSpec } from './showheroesBidAdapter.js'; // eslint-disable-line prebid/validate-imports
import { registerBidder } from '../src/adapters/bidderFactory.js';

export const spec = { ...newSpec, code: 'showheroes-bs' };
registerBidder(spec);

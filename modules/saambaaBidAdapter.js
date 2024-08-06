import { spec } from './advangelistsBidAdapter.js'; // eslint-disable-line prebid/validate-imports
import { registerBidder } from '../src/adapters/bidderFactory.js';
registerBidder(spec);

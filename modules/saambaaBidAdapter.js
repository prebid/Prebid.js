import { spec } from './advangelistBidAdapter.js'; // eslint-disable-line prebid/validate-imports
import { registerBidder } from '../src/adapters/bidderFactory.js';
registerBidder(spec);

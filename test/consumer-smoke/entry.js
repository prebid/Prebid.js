// The root ESLint resolver cannot see this fixture's independently installed npm modules.
/* eslint-disable import/no-unresolved -- Test imports resolve from test/consumer-smoke/node_modules. */
// This file is a consumer, not a Prebid source build: only public npm exports.
import pbjs from 'prebid.js';
import 'prebid.js/modules/magniteBidAdapter';
import 'prebid.js/modules/msftBidAdapter';
import 'prebid.js/modules/userId';
import 'prebid.js/modules/sharedIdSystem';

pbjs.processQueue();

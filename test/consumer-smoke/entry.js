// This file is a consumer, not a Prebid source build: only public npm exports.
import pbjs from 'prebid.js';
import 'prebid.js/modules/appnexusBidAdapter';
import 'prebid.js/modules/rubiconBidAdapter';
import 'prebid.js/modules/userId';
import 'prebid.js/modules/sharedIdSystem';

pbjs.processQueue();

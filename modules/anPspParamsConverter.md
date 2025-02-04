## Quick Summary

This module is a temporary measure for publishers running Prebid.js 9.0+ and using the AppNexus PSP endpoint through their Prebid.js setup.  Please ensure to include this module in your builds of Prebid.js 9.0+, otherwise requests to PSP may not complete successfully.

## Module's purpose

This module replicates certain functionality that was previously stored in the appnexusBidAdapter.js file within a function named transformBidParams.

This transformBidParams was a standard function in all adapters, which helped to change/modify the params and their values to a format that matched the bidder's request structure on the server-side endpoint.  In Prebid.js 9.0, this standard function was removed in all adapter files, so that the whole client-side file (eg appnexusBidAdapter.js) wouldn't have to be included in a prebid.js build file that was meant for server-side bidders.


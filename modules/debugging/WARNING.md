## Warning

This module is also packaged as a "standalone" .js file and loaded dynamically by prebid-core when debugging configuration is passed to `setConfig` or loaded from session storage.

"Standalone" means that it does not have a compile-time dependency on `prebid-core.js` and can therefore work even if it was not built together with it (as would be the case when Prebid is pulled from npm).

Because of this, **this module cannot freely import symbols from core**: anything that depends on Prebid global state (which includes, but is not limited to, `config`, `auctionManager`, `adapterManager`, etc) would *not* work as expected. 

Imports must be limited to logic that is stateless and free of side effects; symbols from `utils.js` are mostly OK, with the notable exception of logging functions (which have a dependency on `config`).

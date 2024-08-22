# Overview

Module Name: Exchain Impression Opportunity Identifier Module (Exchain IOID Module)
Module Type: Analytics Adapter
Maintainer: slonofanya@gmail.com

# Description

The Exchain IOID is an anonymous, unique, and tamper proof identifier appended to RTB ad requests by publishers to address programmatic ecosystem challenges such as bidstream bloat, sustainability and wasted ad spend.

# Integration

1. Compile the Exchain Prebid Module along with your bid adapter and other modules into your Prebid build:

```bash
 gulp build --modules="rtdModule,exchainPrebidAdapter,appnexusBidAdapter,..."  
```

2. Use setConfig to instruct Prebid.js to initialize the Exchain Prebid module, as specified below.

# Configuration

This module is configured as part of the `realTimeData.dataProviders`

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [
            {
                name: "exchainPrebidAdapter",
            }
        ]
    }
});
```

# Contact

Analytics adapter. Contact slonofanya@gmail.com for information.

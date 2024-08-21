# Overview

Module Name: Exchain Prebid Module
Module Type: Analytics Adapter
Maintainer: slonofanya@gmail.com

# Description

The use case for the Exchain IOID is to allow a means for DSPs, exchanges and other adtech platform operators to deduplicate bid requests across multiple supply paths. Our module will create unique, standardized IDs for each Impression Opportunity that will remain persistent throughout the Impression Opportunity journey (ad request - bid request - bid response - win notification...)

We have looked into using Transaction IDs (3.2.2 Object: Source: tid and 3.2.4. Impression: Ext: tid) for this purpose and adtech platforms report that it is not reliably useful for deduplication purposes: TIDs are typically populated by SSPs so the same impression opportunity will have different TIDs when it arrives at the DSP from more than one SSP/Supply path. If/when a publisher populates a prebid ad request with a Transaction ID there is no standardization across publishers so different Impression Opportunities can have identical Transaction IDs.

When subsequent SSPs or exchanges receive the ad request, they may regenerate or modify the Transaction ID to ensure uniqueness within their systems and for their own tracking purposes. This then means that the DSP will receive different Transaction IDs for the same Impression Opportunity rendering deduplication based on Transaction ID meaningless.

The Exchain IOID will solve the growing bidstream bloat problem that all platforms are attempting to address with somewhat indiscriminate throttling based on a wide range of imperfect probabilistic methodologies. The Exchain IOID will also benefit publishers by creating a higher probability that their ad requests will not be throttled and therefore seen more often by more buyers.

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

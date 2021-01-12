# Overview

```
Module Name: Invisibly Analytics

Module Type: Analytics Adapter

Maintainer: sanjay.rawlani@invisibly.com
```

# Description

Analytics adapter for Invisibly. Please contact: sanjay.rawlani@invisibly.com for any additional information. Official website link to the vendor: https://invisibly.com/
We have modified the analytics adapter to fire `Prebid` events only 1% of the time. Most of the time you would not see events getting triggered even though the analyticsAdapter has been enabled.

# Test Parameters

```
{
  provider: 'invisiblyAnalytics',
    options : {
      account: 'invisibly'   //account is a mandatory input to adapter configuration
    }
}
```

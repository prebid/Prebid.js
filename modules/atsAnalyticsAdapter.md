# Overview

```
Module Name:  Ats Analytics Adapter
Module Type:  Analytics Adapter
Maintainer: marko.matic@liveramp.com
```

# Description

Analytics adapter for Authenticated Traffic Solution(ATS), provided by LiveRamp.

# Test Parameters

```
{
  provider: 'atsAnalytics',
  options: {
     pid: '999', // publisher ID
     bidWonTimeout: 2000 // on auction end for how long to wait for bid_won events, by default it's 2000 miliseconds, if it's not set it will be 2000 miliseconds.  
  }
}
```

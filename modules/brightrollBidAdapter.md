# Overview

```
Module Name:  BrightRoll Bidder Adapter
Module Type:  Bidder Adapter
Maintainer: mingsi@oath.com
```

# Description

Connects to BrightRoll DSP+ for bids.

BrightRoll bid adapter requires setup and approval from the DSP+ team. Please reach out to your account team for more information

# Test Parameters
```
  var adUnits = [{
    code: 'banner-ad-div',
    sizes: [300, 250],
    bids: [{
    bidder: 'brightroll',
      params: { 
        publisher: '33across',
        slot: 1,
        test: true
      }
    }]
  }];
```
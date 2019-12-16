# Overview

```
Module Name: Optimera Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kcandiotti@optimera.nyc
```

# Description

Module that adds ad placement visibility scores for DFP.

# Test Parameters
```
    var adUnits = [{
                code: 'div-1',
                sizes: [[300, 250], [300,600]],
                bids: [
                    {
                        bidder: 'optimera',
                        params: {
                              clientID: '9999',
                              device: 'mo'
                        }
                    }]
            },{
                code: 'div-0',
                sizes: [[728, 90]],
                bids: [
                    {
                        bidder: 'optimera',
                        params: {
                              clientID: '9999',
                              device: 'mo'
                        }
                    }]
            }];
```

# AppNexus Issue
There is an issue where the plugin sometimes doesn't return impressions with AppNexus.

There is an open issue here: [#3597](https://github.com/prebid/Prebid.js/issues/3597)

## Configuration Workaround

Optimera's configuration requires the use of size 0,0 which, in some instances, causes the AppNexus ad server to respond to ad requests but not fill impressions. AppNexus and vendors using the AppNexus ad server should monitor 3rd party numbers to ensure there is no decline in fill rate.

Configuration Example:

```
code: ‘leaderboard',
mediaTypes: {
  banner: {
  sizes: [[970, 250],[970, 90],[970, 66],[728, 90],[320, 50],[320, 100],[300, 250],[0, 0]],
  }
}
```

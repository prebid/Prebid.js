# Overview

```
Module Name:  Sublime Bid Adapter
Module Type:  Bidder Adapter
Maintainer: pbjs@sublimeskinz.com
```

# Description

Connects to Sublime for bids.
Sublime bid adapter supports Skinz and M-Skinz formats.

# Nota Bene

Our prebid adapter is unusable with SafeFrame.

# Build

You can build your version of prebid.js, execute: 

```shell
gulp build --modules=sublimeBidAdapter
```

Or to build with multiple adapters

```shell
gulp build --modules=sublimeBidAdapter,secondAdapter,thirdAdapter
```

More details in the root [README](../README.md#Build)

## To build from you own repository

- copy `/modules/sublimeBidAdapter.js` to your `/modules/` directory
- copy `/modules/sublimeBidAdapter.md` to your `/modules/` directory
- copy `/test/spec/modules/sublimeBidAdapter_spec.js` to your `/test/spec/modules/` directory

Then build


# Invocation Parameters

```js
var adUnits = [{
    code: 'sublime',
    mediaTypes: {
        banner: {
            sizes: [1800, 1000]
        }
    },
    bids: [{
        bidder: 'sublime',
        params: {
            zoneId: <zoneId>
        }
    }]
}];
```

Where you replace `<zoneId>` by your Sublime Zone id

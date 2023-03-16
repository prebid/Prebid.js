# Overview

```
Module Name:  SmartXSP Bid Adapter
Module Type:  Bidder Adapter
Maintainer: pbjs@smartxsp.io
```

# Description

Connects to SmartXSP for bids.
SmartXSP bid adapter supports various of format from banner to skin.

# Nota Bene

Our prebid adapter is unusable with SafeFrame.

# Build

You can build your version of prebid.js, execute: 

```shell
gulp build --modules=smartxspBidAdapter
```

Or to build with multiple adapters

```shell
gulp build --modules=smartxspBidAdapter,secondAdapter,thirdAdapter
```

More details in the root [README](../README.md#Build)

## To build from you own repository

- copy `/modules/smartxspBidAdapter.js` to your `/modules/` directory
- copy `/modules/smartxspBidAdapter.md` to your `/modules/` directory
- copy `/test/spec/modules/smartxspBidAdapter_spec.js` to your `/test/spec/modules/` directory

Then build


# Invocation Parameters

```js
var adUnits = [{
    code: 'smartxsp',
    mediaTypes: {
        banner: {
            sizes: [1800, 1000]
        }
    },
    bids: [{
        bidder: 'smartxsp',
        params: {
            zoneId: <zoneId>,
            notifyId: <notifyId>
        }
    }]
}];
```

Where you replace:
- `<zoneId>` by your SmartXSP Zone id;
- `<notifyId>` by your SmartXSP Notify id

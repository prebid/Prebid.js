# Overview

```text
Module Name: Improve Digital Bidder Adapter
Module Type: Bidder Adapter
Maintainer: hb@azerion.com
```

# Description

This module connects publishers to Improve Digital's demand sources through Prebid.js.

# Test Parameters

```javascript
var adUnits = [{
    code: 'div-gpt-ad-1499748733608-0',
    sizes: [[600, 290]],
    bids: [
        {
            bidder: 'improvedigital',
            params: {
                publisherId: 123,
                placementId:1053688
            }
        }
    ]
}, {
    code: 'div-gpt-ad-1499748833901-0',
    sizes: [[250, 250]],
    bids: [{
        bidder: 'improvedigital',
        params: {
            publisherId: 123,
            placementId:1053689,
            keyValues: {
                testKey: ["testValue"]
            }
        }
    }]
}, {
    code: 'div-gpt-ad-1499748913322-0',
    sizes: [[300, 300]],
    bids: [{
        bidder: 'improvedigital',
        params: {
            publisherId: 123,
            placementId:1053687,
            size: {
                w:300,
                h:300
            }
        }
    }]
}];
```

# Additional Information 

## Bid params

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `placementId` | required | The placement ID from Improve Digital. | `1234567` | `integer` |
| `publisherId` | required | The publisher ID from Improve Digital. | `4567` | `integer` |
| `keyValues` | optional | Contains one or more key-value pairings for key-value targeting | `{ testKey1: ['testValueA'], testKey2: ['testValueB', 'testValueC'] }` | `object` |
| `bidFloor` | optional | Bid floor price | `0.01` | `float` |
| `bidFloorCur` | optional | Bid floor price currency. Supported values: USD (default), EUR, GBP, AUD, DKK, SEK, CZK, CHF, NOK | `'USD'` | `string` |
| `extend` | optional | See the [Extend mode section](#extend-mode) | `true` | `boolean` |
| `rendererConfig` | optional | Configuration object for JS renderer of the RAZR creatives. Provided by Improve Digital. | `{ key1: value1 }` | `object` |

## Configuration

### Sizes

By default, the adapter sends Prebid ad unit sizes to Improve Digital’s ad server. If the ad server should only respond with creative sizes as defined for each placement in the Origin platform, turn off `usePrebidSizes` adapter parameter like this:

```javascript
pbjs.setConfig({
    improvedigital: { usePrebidSizes: false }
});
```

### Renderer Config

Global configuration for the special creative format renderer. Please use rendererConfig bid param for ad slot specific configuration.

```javascript
pbjs.setConfig({
    improvedigital: {
        rendererConfig: {
            // Global config object provided by Improve Digital
        }
    }
});
```

### Extend Mode

Improve Digital Extend mode provides publishers with access to additional demand from other SSPs. Before enabling please contact our team for more information.
The Extend mode can be enabled:

* per ad unit via the `extend` [bid param](#bid-params)
* for all ad units via `setConfig()`:

```javascript
pbjs.setConfig({
    improvedigital: {
        extend: true
    }
});
```

### MultiBid

Improve Digital supports Prebid's MultiBid feature. More on enabling MultiBid can be found here: [MultiBid](./multibid/index.md). An example of how to enable MultiBid for Improve Digital:

```javascript
pbjs.setConfig({
    multibid: [{
        bidder: "improvedigital",
        maxBids: 3,
    }]
});
```

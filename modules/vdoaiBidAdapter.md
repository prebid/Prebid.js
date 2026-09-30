# Overview

```
Module Name: VDO.AI Bidder Adapter
Module Type: Bidder Adapter
Maintainer: arjit@z1media.com
```

# Description

Module that connects to VDO.AI's demand sources

# Bid Parameters

| Name          | Scope    | Description                                      | Example               | Type               |
| :------------ | :------- | :----------------------------------------------- | :-------------------- | :----------------- |
| `host`        | required | Ad network's RTB host                            | `'exchange.ortb.net'` | `string`           |
| `adUnitId`    | required | Ad Unit Id will be generated on VDO.AI Platform. | `123456`              | `integer / string` |
| `publisherId` | required | publisherId will be generated on VDO.AI Platform | `'pub-abc'`           | `string`           |
| `adUnitType`  | required | Type of Ad Unit (`'video'`, `'banner'`)          | `'banner'`            | `string`           |
| `custom1`     | optional | Custom targeting field 1                         | `'custom1'`           | `string`           |
| `custom2`     | optional | Custom targeting field 2                         | `'custom2'`           | `string`           |
| `custom3`     | optional | Custom targeting field 3                         | `'custom3'`           | `string`           |
| `custom4`     | optional | Custom targeting field 4                         | `'custom4'`           | `string`           |
| `custom5`     | optional | Custom targeting field 5                         | `'custom5'`           | `string`           |
| `bidfloor`    | optional | Minimum bid floor price in USD                   | `1.5`                 | `float`            |

# Test Parameters for banner

```
var adUnits = [{
    code: 'placementCode',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
    },
    bids: [{
        bidder: 'vdoai',
        params: {
            host: 'ortb.vdo.ai',
            adUnitId: 123456,
            publisherId: 'pub-abc',
            adUnitType: 'banner',
            custom1: 'custom1',
            custom2: 'custom2',
            custom3: 'custom3',
            custom4: 'custom4',
            custom5: 'custom5',
            bidfloor: 1.5
        }
    }]
}];
```

# Test Parameters for video

```
var videoAdUnit = [{
    code: 'video1',
    sizes: [[300, 250]],
    bids: [{
        bidder: 'vdoai',
        params: {
            host: 'ortb.vdo.ai',
            adUnitId: 123456,
            publisherId: 'pub-abc',
            adUnitType: 'video',
            custom1: 'custom1',
            custom2: 'custom2',
            custom3: 'custom3',
            custom4: 'custom4',
            custom5: 'custom5',
            bidfloor: 1.5
        }
    }]
}];
```

# Configuration

The VDO.AI Bidder Adapter expects Prebid Cache(for video) to be enabled so that we can store and retrieve a single vastXml.

```
pbjs.setConfig({
    usePrebidCache: true,
    cache: {
        url: 'https://prebid.example.com/pbc/v1/cache'
    }
});
```

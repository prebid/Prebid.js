# Overview

Module Name: Bridgeupp Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@bridgeupp.com

# Description

Module that connects to Bridgeupp's demand sources.

# Bid Params

| Name          | Scope    | Description          | Example  | Type     |
|---------------|----------|----------------------|----------|----------|
| `siteId`      | required | Placement ID         | `'1234'` | `string` |
| `bidfloor`    | optional | Minimum price in USD | `'1.50'` | `float`  |

# Test Parameters

## Banner
```
    var adUnits = [{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250], [336, 336]]
                }
            },

            bids: [{
                bidder: 'sonarads',
                params: {
                    siteId: 'site-id-example-132', // siteId provided by Bridgeupp
                    bidfloor: 0.01
                }
            }]

    }];
```

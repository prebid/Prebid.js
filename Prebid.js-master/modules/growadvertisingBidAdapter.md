---
layout: bidder
title: GrowAdvertising
description: Prebid GrowAdvertising Bidder Adapter
pbjs: true
biddercode: growads
media_types: banner
---

### Bid Params

| Name          | Scope    | Description  |  Example  | Type     |
|----------|----------|-----------|--------------------|----------|
| `zoneId` | required | ZoneId ID | `'unique-zone-id'` | `string` |
| `domain` | optional | Domain | `'example.org'` | `string` |
| `minCPM` | optional | Minimum CPM | `1.5` | `float` |
| `maxCPM` | optional | Maximum CPM | `10.8` | `float` |

# Test Parameters
```
var adUnits = [
       {
           code: 'test-div',
           mediaTypes: {
               banner: {
                   sizes: [[300, 250]]
               }
           },
           bids: [
               {
                   bidder: "growads",
                   params: {
                       zoneId: '6WG9JK8-RvKai86-yL980YC-kQFoqXZ',
                       domain: 'native-test.growadvertising.com'
                   }
               }
           ]
       },
       // Native adUnit
       {
          code: 'native-div',
          sizes: [[1, 1]],
          mediaTypes: {
              native: {
                  title: {
                      required: true
                  },
                  body: {
                      required: true
                  },
                  image: {
                      required: true
                  },
                  sponsoredBy: {
                      required: true
                  },
              }
          },
          bids: [
              {
                  bidder: 'growads',
                  params: {
                      zoneId: 'YpQobqT-vEybhHx-1qaNMFx-Wj3Kwc2',
                      domain: 'native-test.growadvertising.com'
                  }
              }
          ]
       },
   ];
```

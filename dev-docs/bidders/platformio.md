---
layout: bidder
title: Platform.io
description: Prebid Platform.io Bidder Adapter
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: platformio
biddercode_longer_than_12: false
prebid_1_0_supported : true
---

### bid params

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                         | Example |
| :------------- | :------- | :---------------------------------- | :------ |
| `pubId`        | required | The publisher account ID            | `28082` |
| `siteId`       | required | The publisher site ID               | `26047` |
| `size`         | required | Ad size identifier                  | `300X250` |
| `placementId`  | required | Identifies specific ad placement    | `17394` |
| `bidFloor`     | optional | The bid floor                       | `0.001` |

### test params

```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'platformio',
          params: { 
              pubId: '29521',
              siteId: '26047',
              size: '300X250',
              placementId: '123',
              bidFloor: '0.001'
          }
      }]
    },{
      code: 'native-ad-div',
      sizes: [[1, 1]],
      nativeParams: {
          title: { required: true, len: 75  },
          image: { required: true  },
          body: { len: 200  },
          sponsoredBy: { len: 20 },
          icon: { required: false }
      },
      bids: [{
          bidder: 'platformio',
          params: { 
              pubId: '29521',
              siteId: '26047',
              placementId: '123',
              bidFloor: '0.001'
          }
      }]
    }];

```

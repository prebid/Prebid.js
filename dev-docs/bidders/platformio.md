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
media_types: native, video
---

### bid params

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                         | Example |
| :------------- | :------- | :---------------------------------- | :------ |
| `pubId`        | required | The publisher account ID            | `'28082'` |
| `siteId`       | required | The publisher site ID               | `'26047'` |
| `size`         | required | Ad size identifier                  | `'300X250'` |
| `placementId`  | required | Identifies specific ad placement    | `'17394'` |
| `bidFloor`     | optional | The bid floor                       | `'0.001'` |
| `ifa`          | optional | IFA ID                              | `'XXX-XXX'` |
| `latitude`     | optional | Latitude                            | `'40.712775'` |
| `longitude`    | optional | Longitude                           | `'-74.005973'` |

### test params

```
  var adUnits = [{
          code: 'dfp-native-div',
          mediaType: 'native',
          mediaTypes: {
              native: {
                  title: {
                      required: true,
                      len: 75
                  },
                  image: {
                      required: true
                  },
                  body: {
                      len: 200
                  },
                  icon: {
                      required: false
                  }
              }
          },
          bids: [{
              bidder: 'platformio',
              params: {
                  pubId: '29521',
                  siteId: '26048',
                  placementId: '123',
              }
          }]
      },
      {
          code: 'dfp-banner-div',
          mediaTypes: {
              banner: {
                  sizes: [
                      [300, 250]
                  ],
              }
          },
          bids: [{
              bidder: 'platformio',
              params: {
                  pubId: '29521',
                  siteId: '26049',
                  size: '300X250',
                  placementId: '123',
              }
          }]
      },
      {
          code: 'dfp-video-div',
          sizes: [640, 480],
          mediaTypes: {
              video: {
                  context: "instream"
              }
          },
          bids: [{
              bidder: 'platformio',
              params: {
                  pubId: '29521',
                  siteId: '26049',
                  size: '640X480',
                  placementId: '123',
                  video: {
                      skippable: true,
                  }
              }
          }]
      }
  ];
```

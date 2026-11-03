# Overview

```
Module Name:  Triplelift Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@triplelift.com
```

# Description

Connects to Triplelift Exchange for bids.

The Triplelift bid adapter supports Banner, Video and Native.

# Bid Params

| Name            | Scope                       | Type   | Description                                                                                                              |
|-----------------|-----------------------------|--------|--------------------------------------------------------------------------------------------------------------------------|
| `inventoryCode` | required                    | string | Triplelift inventory code for the placement.                                                                              |
| `parentId`      | recommended                 | string | Identifies the parent account the inventory belongs to. Contact prebid@triplelift.com if you do not know your `parentId`. |
| `publisherId`   | recommended                 | string | Identifies the publisher the inventory belongs to.                                                                        |
| `floor`         | optional                    | number | Bid floor in USD. Used only when the [Price Floors module](https://docs.prebid.org/dev-docs/modules/floors.html) does not supply one. |
| `video`         | optional                    | object | ORTB video fields, merged over `mediaTypes.video`.                                                                        |

Note that Triplelift transacts in **USD only**. A floor expressed in another currency is
converted when the [currency module](https://docs.prebid.org/dev-docs/modules/currency.html)
is present; without it, the floor cannot be honoured and is ignored with a warning.

# Configuration

Requests are gzip compressed by default. To disable:

```javascript
pbjs.setBidderConfig({
    bidders: ['triplelift'],
    config: {
        gzipEnabled: false
    }
});
```

# Storage

The adapter reads the `opecloud_ctx` key from local storage, if present, and forwards it
as first party data on the bid request. This requires `storageAllowed` for the bidder.

# Sample Banner Ad Unit: For Publishers
```
var bannerAdUnits = [{
    code: 'banner-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 600], [300, 250], [320, 90]],
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
           inventoryCode: 'forbes_main', // required 
           parentId: 'forbes_main_parent_id', // recommended
           publisherId: 'forbes_main_publisher_id', // recommended 
           floor: 1.009 // recommended 
        }
    }]
}];
```

# Sample Video Ad Unit: For Publishers
```
var videoAdUnits = [{
    code: 'instream-div-1',
    mediaTypes: {
        video: {
            playerSize: [640, 480],
            context: 'instream',
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
            inventoryCode: 'instream_test', // required
            parentId: 'instream_parent_id', // recommended
            publisherId: 'instream_publisher_id', // recommended
            video: {
                mimes: ['video/mp4'],
                w: 640,
                h: 480,
            }
        }
    }]
}];
```

# Sample Native Ad Unit: For Publishers
```
var nativeAdUnits = [{
    code: 'native-div',
    mediaTypes: {
        native: {
            image: {
                required: true,
                sizes: [150, 50]
            },
            title: {
                required: true,
                len: 80
            },
            sponsoredBy: {
                required: true
            },
            clickUrl: {
                required: true
            }
        }
    },
    bids: [{
      bidder: 'triplelift',
      params: {
        inventoryCode: 'native_test', // required
        parentId: 'native_parent_id', // recommended
        publisherId: 'native_publisher_id', // recommended
      }
    }]
}];
```

# Sample Configuration for Multi-format Ad Unit: For Publishers
```
var multiAdUnit = [{
    code: 'multi-div',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250],
                [728, 90]
            ]
        },
        video: {
            playerSize: [640, 480], // required
            context: 'instream'
        },
        native: {
            image: {
                required: true,
                sizes: [150, 50]
            },
            title: {
                required: true,
                len: 80
            },
            sponsoredBy: {
                required: true
            },
            clickUrl: {
                required: true
            }
        }
    },
    bids: [{
      bidder: 'triplelift',
      params: {
        inventoryCode: 'native_test', // required
        parentId: 'native_parent_id', // recommended
        publisherId: 'native_publisher_id', // recommended
        video: {
            mimes: ['video/mp4'],
            w: 640,
            h: 480,
        }
      }
    }]
 }];
```

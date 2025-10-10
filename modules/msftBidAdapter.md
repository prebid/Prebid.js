# Overview

```
Module Name: Microsoft Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@microsoft.com
```

# Description

The Microsoft Bid Adapter connects to Microsoft's advertising exchange for bids. This adapter supports banner, video (instream and outstream), and native ad formats using OpenRTB 2.5 standards.

The Microsoft adapter requires setup and approval from the Microsoft Advertising team. Please reach out to your account team for more information.

# Migration from AppNexus Bid Adapter

## Bid Parameters

If you are migrating from the AppNexus bid adapter, the following table shows how the bid parameters have changed:

| AppNexus Parameter | Microsoft Parameter | Description |
|-------------------|-------------------|-------------|
| `params.placementId` | `params.placement_id` | Placement ID (**only** the underscore case is now supported) |
| `params.member` | `params.member` | Member ID (unchanged) |
| `params.inv_code` | `params.inv_code` | Inventory code (unchanged) |
| `params.publisher_id` | Use `ortb2.publisher.id` | Publisher ID (moved to ortb2 config) |
| `params.frameworks` | `params.banner_frameworks` | Banner API frameworks array |
| `params.user` | Use `ortb2.user` | User data (moved to ortb2 config) |
| `params.allow_smaller_sizes` | `params.allow_smaller_sizes` | Allow smaller ad sizes (unchanged) |
| `params.use_pmt_rule` | `params.use_pmt_rule` | Use payment rule (unchanged) |
| `params.keywords` | `params.keywords` | Tag/Imp-level keywords (use ORTB format of comma-delimited string value; eg pet=cat,food,brand=fancyfeast) |
| `params.video` | Use `mediaTypes.video` | Video parameters (moved to mediaTypes) |
| `params.video.frameworks` | Use `mediaTypes.video.api` | Video API frameworks (moved to mediaTypes) |
| `params.app` | Use `ortb2.app` | App data (moved to ortb2 config) |
| `params.reserve` | Use bidfloor module | Reserve price (use bidfloor module) |
| `params.position` | Use `mediaTypes.banner.pos` | Banner position (moved to mediaTypes) |
| `params.traffic_source_code` | `params.traffic_source_code` | Traffic source code (unchanged) |
| `params.supply_type` | Use `ortb2.site` or `ortb2.app` | Supply type (moved to ortb2 config) |
| `params.pub_click` | `params.pubclick` | Publisher click URL (dropped underscore to align to endpoint) |
| `params.ext_inv_code` | `params.ext_inv_code` | External inventory code (unchanged) |
| `params.external_imp_id` | `params.ext_imp_id` | External impression ID (shortend to ext) |

## Migration Example

**Before (AppNexus):**
```javascript
{
  bidder: "appnexus",
  params: {
    placementId: "12345",
    member: "123",
    publisher_id: "456",
    frameworks: [1, 2],
    position: "above",
    reserve: 0.50,
    keywords: "category=sports,team=football"
  }
}
```

**After (Microsoft):**
```javascript
{
  bidder: "msft",
  params: {
    placement_id: "12345",
    member: "123",
    banner_frameworks: [1, 2],
    keywords: "category=sports,team=football"
  }
}
```

## Native 

If you are migrating from the AppNexus bid adapter, the setup for Native adUnits now require the use of the Prebid.js ORTB Native setup.  The Microsoft Bid Adapter no longer offers support to the legacy Prebid.js Native adUnit setup.  Requests using that approach will not work and need to be converted to the equivalent values in the adUnit.  This change is made to better align with Prebid.js and many other Bid Adapters that support Native in an ORTB context.

Please refer to the [Prebid.js Native Implementation Guide](https://docs.prebid.org/prebid/native-implementation.html) if you need additional information to implement the setup.

# Test Parameters

## Banner
```javascript
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [
      {
        bidder: "msft",
        params: {
          placement_id: "12345"
        }
      }
    ]
  }
];
```

## Video
```javascript
var videoAdUnit = {
  code: 'video-ad-unit',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [640, 480],
      mimes: ['video/mp4'],
      protocols: [2, 3],
      maxduration: 30,
      api: [2]
    }
  },
  bids: [
    {
      bidder: 'msft',
      params: {
        placement_id: "67890"
      }
    }
  ]
};
```

## Native
```javascript
var nativeAdUnit = {
  code: 'native-ad-unit',
  mediaTypes: {
    native: {
      ortb: {
        ver: '1.2',
        assets: [{
          id: 1,
          required: 1,
          img: {
            type: 3,
            w: 300,
            h: 300
          }
        }, {
          id: 2,
          required: 1,
          title: {
            len: 100,
          }
        }, {
          id: 3,
          required: 1,
          data: {
            type: 1
          }
        }]
      }
    }
  },
  bids: [
    {
      bidder: 'msft',
      params: {
        placement_id: "13579"
      }
    }
  ]
};
```

## Multi-format Ad Unit
```javascript
var multiFormatAdUnit = {
  code: 'multi-format-ad-unit',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]]
    },
    video: {
      context: 'outstream',
      playerSize: [300, 250]
    }
  },
  bids: [
    {
      bidder: 'msft',
      params: {
        member: "123",
        inv_code: "test_inv_code",
        allow_smaller_sizes: true,
        banner_frameworks: [1, 2],
        keywords: "category=news,section=sports"
      }
    }
  ]
};
```

# Supported Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `placement_id` | String | Yes* | Placement ID from Microsoft Advertising |
| `member` | String | Yes* | Member ID (required if placement_id not provided) |
| `inv_code` | String | Yes* | Inventory code (required if placement_id not provided) |
| `allow_smaller_sizes` | Boolean | No | Allow smaller ad sizes than requested |
| `use_pmt_rule` | Boolean | No | Use payment rule |
| `keywords` | String | No | Comma-delimited keywords for targeting |
| `traffic_source_code` | String | No | Traffic source identifier |
| `pubclick` | String | No | Publisher click URL |
| `ext_inv_code` | String | No | External inventory code |
| `ext_imp_id` | String | No | External impression ID |
| `banner_frameworks` | Array of Integers | No | Supported banner API frameworks |

*Either `placement_id` OR both `member` and `inv_code` are required.

# Configuration

## Global Configuration
```javascript
pbjs.setConfig({
  ortb2: {
    site: {
      publisher: {
        id: "your-publisher-id"
      }
    },
    user: {
      keywords: "global,keywords,here"
    }
  }
});
```

## Floor Prices
```javascript
pbjs.setConfig({
  floors: {
    enforcement: {
      enforceJS: true,
      floorDeals: true
    },
    data: {
      currency: 'USD',
      schema: {
        delimiter: '*',
        fields: ['mediaType', 'size']
      },
      values: {
        'banner*300x250': 0.50,
        'video*640x480': 1.00,
        '*': 0.25
      }
    }
  }
});
```

# User Sync

The Microsoft adapter supports both iframe and pixel user syncing. It will attempt iframe sync first if enabled and GDPR consent is available, otherwise it will fall back to pixel sync.

```javascript
pbjs.setConfig({
  userSync: {
    iframeEnabled: true,
    pixelEnabled: true,
    syncDelay: 3000
  }
});
```

# Overview

```
Module Name: Axonix Bidder Adapter
Module Type: Bidder Adapter
Maintainer: engineering@emodo.com
```

# Description

Module that connects to Axonix OpenRTB demand to fetch bids for **Banner** and **Video** inventory.

The adapter sends one POST request per ad unit bid to the Axonix Prebid.js v2 endpoint. Bid requests include device, site/app, consent, supply chain, first-party data (`ortb2`), and user ID signals when available.

Integration requires a valid Axonix `supplyId`. Contact Axonix for account setup and regional endpoint details.

**Supported media types:** banner, video  
**GVL ID:** 141

# Bid Parameters

| Name | Scope | Type | Description | Example |
| ---- | ----- | ---- | ----------- | ------- |
| `supplyId` | required | String | Axonix supply identifier | `"your-supply-id"` |
| `region` | optional | String | Axonix regional endpoint prefix. Defaults to `us-east-1` | `"us-east-1"` |
| `endpoint` | optional | String | Override the default bid URL | `"https://custom.example.com/bid"` |
| `referrer` | optional | String | Page URL override for the bid request | `"https://example.com/page"` |
| `secure` | optional | Boolean | When `true`, upgrades `http:` page URLs to `https:` | `true` |

**Default bid endpoint:**

```
https://openrtb-{region}.axonix.com/supply/prebid-js/v2/prebid/{supplyId}
```

If `region` is omitted, `us-east-1` is used.

# Banner Test Parameters

```javascript
var adUnits = [{
  code: 'banner-ad-unit',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [728, 90]]
    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'your-supply-id',   // required
      region: 'us-east-1'           // optional
    }
  }]
}];
```

# Video Test Parameters

Video ad units must include a non-empty `mimes` array.

```javascript
var adUnits = [{
  code: 'video-ad-unit',
  mediaTypes: {
    video: {
      context: 'instream',                    // recommended
      playerSize: [640, 480],                 // recommended
      mimes: ['video/mp4', 'video/webm'],     // required
      protocols: [2, 3, 5, 6],                // optional
      playbackmethod: [1, 2],                 // optional
      placement: 1,                           // optional
      minduration: 5,                         // optional
      maxduration: 30                         // optional
    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'your-supply-id'              // required
    }
  }]
}];
```

# Multi-format Test Parameters

```javascript
var adUnits = [{
  code: 'multi-format-ad-unit',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    },
    video: {
      context: 'outstream',
      playerSize: [640, 480],
      mimes: ['video/mp4']                    // required when video is present
    }
  },
  bids: [{
    bidder: 'axonix',
    params: {
      supplyId: 'your-supply-id'
    }
  }]
}];
```

# Floor Pricing

The adapter reads floors from the Prebid.js [Price Floors](https://docs.prebid.org/dev-docs/modules/floors.html) module via `bidRequest.getFloor()`.

```javascript
pbjs.setConfig({
  floors: {
    data: {
      currency: 'USD',
      schema: {
        fields: ['mediaType', 'size']
      },
      values: {
        'banner|300x250': 1.50,
        'video|640x480': 3.50,
        '*|*': 1.00
      }
    }
  }
});
```

# First-Party Data (ortb2)

Site, app, device, user, and regulatory data from global `ortb2` configuration are forwarded with each request.

```javascript
pbjs.setConfig({
  ortb2: {
    site: {
      name: 'Publisher Site',
      domain: 'publisher.com',
      cat: ['IAB1-1']
    },
    device: {
      ifa: 'advertising-id',
      make: 'Apple',
      model: 'iPhone'
    },
    user: {
      ext: {
        data: [{
          name: 'publisher_segments',
          segment: [{ id: 'sports_fan' }]
        }]
      }
    }
  }
});
```

# Privacy and Compliance

GDPR, US Privacy (CCPA), and GPP consent objects are included automatically when configured through Prebid consent management.

```javascript
pbjs.setConfig({
  consentManagement: {
    gdpr: {
      cmpApi: 'iab',
      timeout: 10000
    },
    usp: {
      cmpApi: 'iab',
      timeout: 1000
    },
    gpp: {
      cmpApi: 'iab',
      timeout: 10000
    }
  }
});
```

# Supply Chain (schain)

Supply chain objects from `ortb2.source` or bidder-specific schain configuration are forwarded with bid requests.

```javascript
pbjs.setBidderConfig({
  bidders: ['axonix'],
  config: {
    schain: {
      validation: 'strict',
      config: {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'publisher.com',
          sid: 'pub-123',
          hp: 1
        }]
      }
    }
  }
});
```

# App Inventory

For in-app traffic, set the global Prebid `app` object or provide `ortb2.app`.

```javascript
pbjs.setConfig({
  app: {
    bundle: 'com.publisher.app',
    storeurl: 'https://play.google.com/store/apps/details?id=com.publisher.app',
    domain: 'publisher.com'
  }
});
```

# User ID Modules

User ID modules are supported through Prebid's standard user ID pipeline. Encoded IDs are forwarded as `userIdAsEids` in the bid request payload.

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'unifiedId',
      params: {
        partner: 'abc'
      }
    }]
  }
});
```

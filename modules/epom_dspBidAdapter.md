# Overview

```
Module Name:  Epom DSP Bid Adapter
Module Type:  Bidder Adapter
Maintainer: support@epom.com
```

# Description

The **Epom DSP Bid Adapter** allows publishers to connect with the Epom DSP Exchange for programmatic advertising. It supports banner formats and adheres to the OpenRTB protocol.

## Supported Features

| Feature             | Supported |
|---------------------|-----------|
| **TCF 2.0 Support** | ✅ Yes     |
| **US Privacy (CCPA)** | ✅ Yes     |
| **GPP Support**    | ✅ Yes     |
| **Media Types**     | Banner    |
| **Floors Module**   | ✅ Yes     |
| **User Sync**       | iframe, image |
| **GDPR Compliance** | ✅ Yes     |

# Integration Guide for Publishers

## Basic Configuration

Below is an example configuration for integrating the Epom DSP Bid Adapter into your Prebid.js setup.

### Sample Banner Ad Unit

```javascript
var adUnits = [
  {
    code: 'epom-banner-div',
    mediaTypes: {
      banner: {
        sizes: [            
            [300, 250],
            [728, 90],
            [160, 600],
        ]
      }
    },
    bids: [
      {
        bidder: 'epom_dsp',
        params: {
          endpoint: 'https://bidder.epommarket.com/bidder/v2_5/bid?key=d0b9fb9de9dfbba694dfe75294d8e45a'
        }
      }
    ]
  }
];
```

---

# Params

The following parameters can be configured in the `params` object for the **Epom DSP Bid Adapter**.

| Parameter      | Type     | Required | Description                                                             |
|--------------|----------|----------|-------------------------------------------------------------------------|
| `endpoint`   | string   | Yes      | The URL of the Epom DSP bidding endpoint.                               |
| `adUnitId`   | string   | No       | Unique identifier for the Ad Unit.                                      |
| `bidfloor`   | number   | No       | Minimum CPM value for the bid in USD.                                   |

---

# Global Settings (Optional)

You can define **global configuration parameters** for the **Epom DSP Bid Adapter** using `pbjs.setBidderConfig`. This is **optional** and allows centralized control over bidder settings.

### Example Global Configuration

```javascript
pbjs.setBidderConfig({
    bidders: ['epom_dsp'],
    config: {
        epomSettings: {
            endpoint: 'https://bidder.epommarket.com/bidder/v2_5/bid?key=d0b9fb9de9dfbba694dfe75294d8e45a'
        }
    }
});
```

---

# Response Format

The **Epom DSP Bid Adapter** complies with the OpenRTB protocol and returns responses in the following format:

```json
{
  "bids": [
    {
      "requestId": "12345",
      "cpm": 1.50,
      "currency": "USD",
      "width": 300,
      "height": 250,
      "ad": "<div>Ad content</div>",
      "creativeId": "abc123",
      "ttl": 300,
      "netRevenue": true
    }
  ]
}
```

### Response Fields

| Field         | Type     | Description                                      |
|--------------|----------|--------------------------------------------------|
| `requestId`  | string   | Unique identifier for the bid request.           |
| `cpm`        | number   | Cost per thousand impressions (CPM) in USD.      |
| `currency`   | string   | Currency of the bid (default: USD).              |
| `width`      | number   | Width of the ad unit in pixels.                  |
| `height`     | number   | Height of the ad unit in pixels.                 |
| `ad`         | string   | HTML markup for rendering the ad.                |
| `creativeId` | string   | Identifier for the creative.                     |
| `ttl`        | number   | Time-to-live for the bid (in seconds).           |
| `netRevenue` | boolean  | Indicates whether the CPM is net revenue.        |

---

# GDPR and Privacy Compliance

The **Epom DSP Bid Adapter** supports GDPR and CCPA compliance. Consent information can be passed via:

- `bidderRequest.gdprConsent`
- `bidderRequest.uspConsent`

---

# Support

For integration assistance, contact [Epom Support](mailto:support@epom.com).

---

# Examples

## Basic Banner Ad Unit

```javascript
var adUnits = [
  {
    code: 'epom-banner',
    mediaTypes: {
      banner: {
        sizes: [            
            [300, 250],
            [728, 90],
            [160, 600],
        ]
      }
    },
    bids: [
      {
        bidder: 'epom_dsp',
        params: {
          endpoint: 'https://bidder.epommarket.com/bidder/v2_5/bid?key=d0b9fb9de9dfbba694dfe75294d8e45a'
        }
      }
    ]
  }
];

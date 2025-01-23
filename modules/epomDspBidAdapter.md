
# Overview

```
Module Name:  Epom DSP Bid Adapter
Module Type:  Bidder Adapter
Maintainer: support@epom.com
```

# Description

The **Epom DSP Bid Adapter** connects publishers to the Epom DSP Exchange for programmatic advertising. This adapter supports banner formats and follows the OpenRTB protocol.

# Supported Media Types

- **Banner**

---

# Integration Guide for Publishers

## Basic Configuration

Here is an example configuration for integrating the Epom DSP Bid Adapter into your Prebid.js setup.

### Sample Banner Ad Unit

```javascript
var adUnits = [
  {
    code: 'epom-banner-div', // Ad slot HTML element ID
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250], 
          [728, 90]
        ] // Banner sizes
      }
    },
    bids: [
      {
        bidder: 'epomDsp', // Adapter code
        params: {
          endpoint: 'https://your-epom-endpoint.com/bid', // Epom DSP endpoint
        }, 
          adUnitId: 'sampleAdUnitId123', // Unique Ad Unit ID
          bidfloor: 0.5, // Minimum bid floor (optional)
      }
    ]
  }
];
```

---

# Params

Below are the parameters that can be configured in the `params` object for the **Epom DSP Bid Adapter**.

| Parameter      | Type     | Required | Description                                                                 |
|----------------|----------|----------|-----------------------------------------------------------------------------|
| `endpoint`     | string   | Yes      | The URL of the Epom DSP bidding endpoint.                                   |
| `adUnitId`     | string   | No       | Unique identifier for the Ad Unit.                                          |
| `bidfloor`     | number   | No       | Minimum CPM value for the bid in USD.                                       |
| `banner`       | object   | No       | Banner-specific parameters like `btype` (ad type) or `pos` (ad position).   |

---

# Global Settings (Optional)

You can define global configuration parameters for the **Epom DSP Bid Adapter** using `pbjs.setBidderConfig`. These settings will apply to all requests made via the adapter.

### Example Global Configuration

```javascript
pbjs.setBidderConfig({
  bidders: ['epomDsp'],
  config: {
    epomSettings: {
        endpoint: 'https://your-epom-endpoint.com/bid', // Epom DSP endpoint
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
      "requestId": "uniqueRequestId",
      "cpm": 1.5,
      "currency": "USD",
      "width": 300,
      "height": 250,
      "ad": "<div>Ad Markup</div>",
      "creativeId": "creative123",
      "ttl": 300,
      "netRevenue": true
    }
  ]
}
```

### Response Fields

| Field          | Type     | Description                                                              |
|----------------|----------|--------------------------------------------------------------------------|
| `requestId`    | string   | Unique identifier for the bid request.                                   |
| `cpm`          | number   | Cost per thousand impressions (CPM) in USD.                              |
| `currency`     | string   | Currency of the bid (default: USD).                                      |
| `width`        | number   | Width of the ad unit in pixels.                                          |
| `height`       | number   | Height of the ad unit in pixels.                                         |
| `ad`           | string   | HTML markup for rendering the ad.                                       |
| `creativeId`   | string   | Identifier for the creative.                                             |
| `ttl`          | number   | Time-to-live for the bid (in seconds).                                   |
| `netRevenue`   | boolean  | Indicates whether the CPM is net revenue (`true` by default).            |

---

# GDPR and Privacy Compliance

The **Epom DSP Bid Adapter** supports GDPR and CCPA compliance. Consent information can be passed via the following fields in `bidderRequest`:

- `bidderRequest.gdprConsent`
- `bidderRequest.uspConsent`

---

# Support

For questions or issues with integration, please contact [Epom Support](mailto:support@epom.com).

---

# Examples

## Basic Banner Ad Unit

```javascript
var adUnits = [
  {
    code: 'epom-banner', // Ad slot HTML element ID
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [
      {
        bidder: 'epomDsp',
        params: {
          endpoint: 'https://your-epom-endpoint.com/bid',
        },
          adUnitId: 'adUnit123',
          bidfloor: 0.5
      }
    ]
  }
];
```

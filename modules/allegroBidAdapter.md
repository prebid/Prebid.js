# Overview

**Module Name**: Allegro Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: the-bidders@allegro.com
**GVLID**: 1493

# Description

Connects to Allegro's demand sources for banner advertising. This adapter uses the OpenRTB 2.5 protocol with support for extension field conversion to Google DoubleClick proto format.

# Supported Media Types

- Banner
- Native
- Video

# Configuration

The Allegro adapter supports the following configuration options:

## Global Configuration Parameters

| Name                             | Scope    | Type    | Description                                                                 | Default                                                 |
|----------------------------------|----------|---------|-----------------------------------------------------------------------------|---------------------------------------------------------|
| `allegro.bidderUrl`              | optional | String  | Custom bidder endpoint URL                                                  | `https://prebid.rtb.allegro.pl/v1/rtb/prebid/bid` |
| `allegro.convertExtensionFields` | optional | Boolean | Enable/disable conversion of OpenRTB extension fields to DoubleClick format | `true`                                                  |
| `allegro.triggerImpressionPixel` | optional | Boolean | Enable/disable triggering impression tracking pixels on bid won event       | `false`                                                 |

## Configuration example

```javascript
pbjs.setConfig({
  allegro: {
    triggerImpressionPixel: true
  }
});
```

# AdUnit Configuration Example

## Banner Ads

```javascript
var adUnits = [{
  code: 'banner-ad-div',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [728, 90],
        [300, 600]
      ]
    }
  },
  bids: [{
    bidder: 'allegro'
  }]
}];
```

# Features
## Impression Tracking

When `allegro.triggerImpressionPixel` is enabled, the adapter will automatically fire the provided `burl` (billing/impression) tracking URL when a bid wins.

## Bid Metadata

The adapter exposes advertiser metadata from the bid response on the standard `bid.meta` object:

| `bid.meta` field    | Source in OpenRTB bid response                                                                 | Description           |
|---------------------|------------------------------------------------------------------------------------------------|-----------------------|
| `advertiserDomains` | `bid.adomain`                                                                                  | Advertiser domain(s)  |
| `advertiserId`      | `bid.ext['[com.allegro.dsp.dsp_bid]'].clientId` or `bid['[com.allegro.dsp.dsp_bid]'].clientId` | Advertiser identifier |
| `productId`         | `bid.ext['[com.allegro.dsp.dsp_bid]'].productId` or `bid['[com.allegro.dsp.dsp_bid]'].productId` | Product identifier    |

The DSP extension fields are delivered as a proto-JSON bracketed key (`[com.allegro.dsp.dsp_bid]`) and may appear either under `bid.ext` or as a top-level proto-JSON key (`bid['[com.allegro.dsp.dsp_bid]']`).

Example server bid response:

```json
{
  "seatbid": [{
    "bid": [{
      "impid": "abc",
      "price": 1.5,
      "adomain": ["advertiser.com"],
      "ext": {
        "[com.allegro.dsp.dsp_bid]": {
          "clientId": "42",
          "productId": "prod-123"
        }
      }
    }]
  }],
  "cur": "USD"
}
```

# Technical Details

- **Protocol**: OpenRTB 2.5
- **TTL**: 360 seconds
- **Net Revenue**: true
- **Content Type**: text/plain


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
| `allegro.bidderUrl`              | optional | String  | Custom bidder endpoint URL                                                  | `https://prebid.rtb.allegrogroup.com/v1/rtb/prebid/bid` |
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

# Technical Details

- **Protocol**: OpenRTB 2.5
- **TTL**: 360 seconds
- **Net Revenue**: true
- **Content Type**: text/plain


# Overview

```
Module Name: Floxis Bidder Adapter
Module Type: Bidder Adapter
Maintainer: admin@floxis.tech
```

# Description

The Floxis Bid Adapter enables integration with the Floxis programmatic advertising platform via Prebid.js. It supports banner, video (instream and outstream), and native formats.

**Key Features:**
- Banner, Video and Native ad support
- OpenRTB 2.x compliant
- Privacy regulation compliance (GDPR, USP, GPP, COPPA)
- Prebid.js Floors Module support

## Supported Media Types
- Banner
- Video
- Native

## Floors Module Support
The Floxis Bid Adapter supports the Prebid.js [Floors Module](https://docs.prebid.org/dev-docs/modules/floors.html). Floor values are automatically included in the OpenRTB request as `imp.bidfloor` and `imp.bidfloorcur`.

## Privacy
Privacy fields (GDPR, USP, GPP, COPPA) are handled by Prebid.js core and automatically included in the OpenRTB request.

## Example Usage
```javascript
pbjs.addAdUnits([
  {
    code: 'adunit-1',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{
      bidder: 'floxis',
      params: {
        seat: 'testSeat',
        region: 'us-e',
        partner: 'floxis'
      }
    }]
  }
]);
```

# Configuration

## Parameters

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `seat` | required | Seat identifier | `'testSeat'` | `string` |
| `region` | required | Region identifier for routing | `'us-e'` | `string` |
| `partner` | required | Partner identifier | `'floxis'` | `string` |

## Testing
Unit tests are provided in `test/spec/modules/floxisBidAdapter_spec.js` and cover validation, request building, response interpretation, and bid-won notifications.

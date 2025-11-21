# Overview

```
Module Name: Floxis Bidder Adapter
Module Type: Floxis Bidder Adapter
Maintainer: admin@floxis.tech
```
# Description

The Floxis Bid Adapter enables integration with the Floxis programmatic advertising platform via Prebid.js. It supports banner, video (instream and outstream), and native formats, and is designed for multi-partner, multi-region use.

**Key Features:**
- Banner, Video and Native ad support
- OpenRTB 2.x compliant
- Privacy regulation compliance

## Required Params
- `partner` (string): Partner name
- `placementId` (integer): Placement identifier

## OpenRTB Blocking Params Support
FloxisBidAdapter supports OpenRTB blocking parameters. You can pass the following optional params in your ad unit config:
- `bcat` (array): Blocked categories
- `badv` (array): Blocked advertiser domains
- `bapp` (array): Blocked app bundle IDs
- `battr` (array): Blocked creative attributes

These will be included in the OpenRTB request and imp objects as appropriate.

**Example:**
```javascript
pbjs.addAdUnits([
  {
    code: 'adunit-20',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{
      bidder: 'floxis',
      params: {
        partner: 'floxis',
        placementId: 555,
        bcat: ['IAB1-1', 'IAB1-2'],
        badv: ['example.com', 'test.com'],
        bapp: ['com.example.app'],
        battr: [1, 2, 3]
      }
    }]
  }
]);
```

## Floors Module Support
FloxisBidAdapter supports Prebid.js Floors Module. If a bid request provides a floor value via the Floors Module (`getFloor` function), it will be sent in the OpenRTB request as `imp.bidfloor` and `imp.bidfloorcur`. If not, you can also set a static floor using `params.bidFloor`.

**Example with Floors Module:**
```javascript
pbjs.addAdUnits([
  {
    code: 'adunit-1',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{
      bidder: 'floxis',
      params: {
        partner: 'floxis',
        placementId: 1,
        bidFloor: 2.5 // optional static floor
      },
      getFloor: function({currency, mediaType, size}) {
        return { floor: 2.5, currency: 'USD' };
      }
    }]
  }
]);
```

## Privacy
Privacy fields (GDPR, USP, GPP, COPPA) are handled by Prebid.js core and automatically included in the OpenRTB request.

## Supported Media Types
- Banner
- Video
- Native

## Example Usage
```javascript
pbjs.addAdUnits([
  {
    code: 'adunit-1',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{
      bidder: 'floxis',
      params: {
        partner: 'floxis',
        placementId: 1
      }
    }]
  }
]);
```


# Configuration
## Required Parameters

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `partner` | required | Partner identifier provided by Floxis | `floxis` | `string` |
| `placementId` | required | Placement identifier provided by Floxis | `1` | `int` |

## Testing
Unit tests are provided in `test/spec/modules/floxisBidAdapter_spec.js` and cover validation, request building, and response interpretation.

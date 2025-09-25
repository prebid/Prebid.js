# Floxis Bid Adapter

## Overview
The Floxis Bid Adapter enables integration with the Floxis programmatic advertising platform via Prebid.js. It supports banner, video, and native formats, and is designed for multi-partner, multi-region use.

**Key Features:**
- Banner, Video and Native ad support
- OpenRTB 2.x compliant
- Privacy regulation compliance

## Endpoint
```
https://<partner>-<region>.floxis.tech/pbjs
```
- `partner`: string, required (default: 'floxis')
- `region`: string, required (default: 'us')

## Required Params
- `partner` (string): Partner name
- `placementId` (integer): Placement identifier

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

# Overview

```
Module Name: CondorX's Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@condorx.io
```

# Description

Module that connects to CondorX bidder to fetch bids. Supports both legacy and OpenRTB request formats.

# Test Parameters
```
    var adUnits = [{
            code: 'condorx-container-id',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  
                }
            },
            bids: [{
                bidder: "condorx",
                params: {
                    widget: 'widget id by CondorX',
                    website: 'website id by CondorX',
                    url:'current url',
                    bidfloor: 0.50
                }
            }]
        },
        {
            code: 'condorx-container-id',
            mediaTypes: {
                native: {
                    image: {
                        required: true,
                        sizes: [236, 202]
                    },
                    title: {
                        required: true,
                        len: 100
                    },
                    sponsoredBy: {
                        required: true
                    },
                    clickUrl: {
                        required: true
                    },
                    body: {
                        required: true
                    }
                }
            },
            bids: [{
                bidder: "condorx",
                params: {
                    widget: 'widget id by CondorX',
                    website: 'website id by CondorX',
                    url:'current url',
                    bidfloor: 0.75
                }
            }]
        },
        {
            code: 'condorx-container-id',
            mediaTypes: {
                banner: {
                    sizes: [[728, 90]],  
                }
            },
            bids: [{
                bidder: "condorx",
                params: {
                    widget: 'widget id by CondorX',
                    website: 'website id by CondorX',
                    url:'current url',
                    bidfloor: 1.00,
                    useOpenRTB: true
                }
            }]
        }    
    }];
```

# Parameters

| Name | Scope | Description | Example | Type | Default |
|------|-------|-------------|---------|------|---------|
| widget | required | Widget ID provided by CondorX | `123456` | integer | - |
| website | required | Website ID provided by CondorX | `789012` | integer | - |
| url | optional | Page URL override | `'https://example.com'` | string | `'current url'` |
| bidfloor | optional | Minimum bid price in USD | `0.50` | number | `-1` |
| useOpenRTB | optional | Enable OpenRTB format requests | `true` | boolean | `false` |

# Request Formats

## Legacy Format (Default)
Uses GET request to legacy endpoint with query parameters:
```
GET https://api.condorx.io/cxb/get.json?w=789012&wg=123456&...
```

## OpenRTB Format
Uses POST request to OpenRTB endpoint with JSON payload:
```
POST https://api.condorx.io/cxb/openrtb.json
Content-Type: application/json

{
  "id": "auction-id",
  "imp": [...],
  "site": {...}
}
```

To enable OpenRTB format, set `useOpenRTB: true` in the bid parameters.

# Overview

```
Module Name: Panxo Bid Adapter
Module Type: Bidder Adapter
Maintainer: tech@panxo.ai
```

# Description

Panxo is a specialized SSP for AI-referred traffic monetization. This adapter enables publishers to monetize traffic coming from AI assistants like ChatGPT, Perplexity, Claude, and Gemini through Prebid.js header bidding.

**Important**: This adapter requires the Panxo Signal script to be installed on the publisher's page. The Signal script must load before Prebid.js to ensure proper user identification and AI traffic detection.

# Prerequisites

1. Register your property at [app.panxo.ai](https://app.panxo.ai)
2. Obtain your `propertyKey` from the Panxo dashboard
3. Install the Panxo Signal script in your page's `<head>`:

```html
<script async src="https://cdn.panxo-sys.com/o/{YOUR_ENDPOINT_KEY}"></script>
```

# Bid Params

| Name | Scope | Description | Example | Type |
|------|-------|-------------|---------|------|
| `propertyKey` | required | Your unique property identifier from Panxo dashboard | `'abc123def456'` | `string` |
| `floor` | optional | Minimum CPM floor price in USD | `0.50` | `number` |

# Configuration Example

```javascript
var adUnits = [{
    code: 'banner-ad',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [728, 90]]
        }
    },
    bids: [{
        bidder: 'panxo',
        params: {
            propertyKey: 'your-property-key-here'
        }
    }]
}];
```

# Full Page Example

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Step 1: Panxo Signal Script (MUST load before Prebid) -->
    <script async src="https://cdn.panxo-sys.com/o/your-endpoint-key"></script>
    
    <!-- Step 2: Prebid.js -->
    <script async src="prebid.js"></script>
    
    <script>
        var pbjs = pbjs || {};
        pbjs.que = pbjs.que || [];
        
        pbjs.que.push(function() {
            pbjs.addAdUnits([{
                code: 'div-ad-1',
                mediaTypes: {
                    banner: { sizes: [[300, 250]] }
                },
                bids: [{
                    bidder: 'panxo',
                    params: {
                        propertyKey: 'your-property-key'
                    }
                }]
            }]);
            
            pbjs.requestBids({
                bidsBackHandler: function() {
                    // Handle bids
                }
            });
        });
    </script>
</head>
<body>
    <div id="div-ad-1"></div>
</body>
</html>
```

# Supported Media Types

| Type | Support |
|------|---------|
| Banner | Yes |
| Video | No |
| Native | No |

# Privacy & Consent

**IAB TCF Global Vendor List ID: 1527**

This adapter is registered with the IAB Europe Transparency and Consent Framework. Publishers using a CMP (Consent Management Platform) should ensure Panxo (Vendor ID 1527) is included in their vendor list.

This adapter supports:

- **GDPR/TCF 2.0**: Consent string is passed in bid requests. GVL ID: 1527
- **CCPA/US Privacy**: USP string is passed in bid requests  
- **GPP**: Global Privacy Platform strings are supported
- **COPPA**: Child-directed content flags are respected

## CMP Configuration

If you use a Consent Management Platform (Cookiebot, OneTrust, Quantcast Choice, etc.), ensure that:

1. Panxo (Vendor ID: 1527) is included in your vendor list
2. Users can grant/deny consent specifically for Panxo
3. The CMP loads before Prebid.js to ensure consent is available

Example TCF configuration with Prebid:

```javascript
pbjs.setConfig({
    consentManagement: {
        gdpr: {
            cmpApi: 'iab',
            timeout: 8000,
            defaultGdprScope: true
        },
        usp: {
            cmpApi: 'iab',
            timeout: 1000
        }
    }
});
```

# User Sync

Panxo supports pixel-based user sync. Enable it in your Prebid configuration:

```javascript
pbjs.setConfig({
    userSync: {
        filterSettings: {
            pixel: {
                bidders: ['panxo'],
                filter: 'include'
            }
        }
    }
});
```

# First Party Data

This adapter supports First Party Data via the `ortb2` configuration:

```javascript
pbjs.setConfig({
    ortb2: {
        site: {
            name: 'Example Site',
            cat: ['IAB1'],
            content: {
                keywords: 'technology, ai'
            }
        },
        user: {
            data: [{
                name: 'example-data-provider',
                segment: [{ id: 'segment-1' }]
            }]
        }
    }
});
```

# Supply Chain (schain)

Supply chain information is automatically passed when configured:

```javascript
pbjs.setConfig({
    schain: {
        validation: 'relaxed',
        config: {
            ver: '1.0',
            complete: 1,
            nodes: [{
                asi: 'publisher-domain.com',
                sid: '12345',
                hp: 1
            }]
        }
    }
});
```

# Floor Prices

This adapter supports the Prebid Price Floors Module. Configure floors as needed:

```javascript
pbjs.setConfig({
    floors: {
        enforcement: { floorDeals: true },
        data: {
            default: 0.50,
            schema: { fields: ['mediaType'] },
            values: { 'banner': 0.50 }
        }
    }
});
```

# Win Notifications

This adapter automatically fires win notification URLs (nurl) when a bid wins the auction. No additional configuration is required.

# Contact

For support or questions:
- Email: tech@panxo.ai
- Documentation: https://docs.panxo.ai

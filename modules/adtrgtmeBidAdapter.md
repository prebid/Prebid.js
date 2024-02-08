# Overview

**Module Name**: adtrgtme Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: info@adtarget.me

# Description
The Adtrgtme Bid Adapter is an OpenRTB interface that support display demand from Adtarget 

# Supported Features:
* Media Types: Banner 
* Multi-format adUnits
* Price floors module
* Advertiser domains

# Mandatory Bidder Parameters
The minimal requirements for the 'adtrgtme' bid adapter to generate an outbound bid-request to our Adtrgtme are:
1. At least 1 banner adUnit 
2. Your Adtrgtme site id **bidder.params**.**sid**

## Example:
```javascript
const adUnits = [{
    code: 'your-placement',
    mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
    bids: [
        {
            bidder: 'adtrgtme',
            params: {
                sid: 1220291391, // Site/App ID provided from SSP
            }
        }
    ]
}];
```

# Optional: Price floors module & bidfloor
The adtargerme adapter supports the Prebid.org Price Floors module and will use it to define the outbound bidfloor and currency.
By default the adapter will always check the existance of Module price floor.
If a module price floor does not exist you can set a custom bid floor for your impression using "params.bidOverride.imp.bidfloor".

```javascript
const adUnits = [{
    code: 'your-placement',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250]
            ]
        }
    },
    bids: [{
        bidder: 'adtrgtme',
        params: {
            sid: 1220291391,
            bidOverride :{
                imp: {
                    bidfloor: 5.00 // bidOverride bidfloor
                }
            }
            }
        }
    }]
}];
```
  # Overview
  
  ```
Module Name:  Adspirit Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@adspirit.de

```
# Description

Connects to Adspirit exchange for bids.

Each adunit with `adspirit` adapter has to have `placementId` and `host`.


### Supported Features;

1. Media Types: Banner & native
2. Multi-format: adUnits
3. Schain module
4. Advertiser domains


## Sample Banner Ad Unit
  ```javascript
		  var adUnits = [
           {
               code: 'display-div',
			 
                    mediaTypes: {
                        banner: {
                            sizes: [[300, 250]]   //a display size
                        }
                    },
    
               bids: [
                   {
                       bidder: "adspirit",
                       params: {
                           placementId: '7',    //Please enter your placementID
                           host: 'test.adspirit.de'   //your host details from Adspirit
                       }
                   }
               ]
           }
       ];
		   
```


### Privacy Policies

General Data Protection Regulation(GDPR) is supported by default.

Complete information on this  URL-- https://support.adspirit.de/hc/en-us/categories/115000453312-General


### CMP (Consent Management Provider)
CMP stands for Consent Management Provider. In simple terms, this is a service provider that obtains and processes the consent of the user, makes it available to the advertisers and, if necessary, logs it for later control. We recommend using a provider with IAB certification or CMP based on the IAB CMP Framework. A list of IAB CMPs can be found at https://iabeurope.eu/cmp-list/. AdSpirit recommends the use of www.consentmanager.de .

### List of functions that require consent

Please visit our page- https://support.adspirit.de/hc/en-us/articles/360014631659-List-of-functions-that-require-consent




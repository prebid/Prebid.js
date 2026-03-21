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
    // Banner Ad Unit
    {
        code: 'display-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]] // A display size
            }
        },
        bids: [
            {
                bidder: "adspirit",
                params: {
                    placementId: '7', // Please enter your placementID
                    host: 'test.adspirit.de' // Your host details from Adspirit
                }
            }
        ]
    },
    // Native Ad Unit
    {
        code: 'native-div',
        mediaTypes: {
            native: {
                ortb: {
                    request: {
                        ver: "1.2",
                        assets: [
                            { id: 1, required: 1, title: { len: 100 } }, // Title
                            { id: 2, required: 1, img: { type: 3, wmin: 1200, hmin: 627, mimes: ["image/png", "image/gif", "image/jpeg"] } }, // Main Image
                            { id: 4, required: 1, data: { type: 2, len: 150 } }, // Body Text
                            { id: 3, required: 0, data: { type: 12, len:50 } }, // CTA Text
                            { id: 6, required: 0, data: { type: 1, len:50 } }, // Sponsored By
                            { id: 5, required: 0, img: { type: 1, wmin: 50, hmin: 50, mimes: ["image/png", "image/gif", "image/jpeg"] } } // Icon Image
                        ]
                    }
                }
            }
        },
        bids: [
            {
                bidder: 'adspirit',
                params: {
                    placementId: '99',
                    host: 'test.adspirit.de',
                    bidfloor: 0.1
                }
            }
        ]
    }
];		   
```

### Short description in five points for native

1. Title (id:1): This is the main heading of the ad, and it should be mandatory with a maximum length of 100 characters.

2. Main Image (id:2): This is the main image that represents the ad content and should be in PNG, GIF, or JPEG format, with the following dimensions: wmin: 1200 and hmin: 627.

3. Body Text (id:4): A brief description of the ad. The Body Text should have a maximum length of 150 characters.

4. CTA (Call to Action) (id:3): A short phrase prompting user action, such as "Shop Now", "Get More Info", etc.

5. Sponsored By (id:6): The advertiser or brand name promoting the ad.

6. Click URL: This is the landing page URL where the user will be redirected after clicking the ad.

In the Adspirit adapter, Title, Main Image, and Body Text are mandatory fields.
### Privacy Policies

General Data Protection Regulation(GDPR) is supported by default.

Complete information on this  URL-- https://support.adspirit.de/hc/en-us/categories/115000453312-General


### CMP (Consent Management Provider)
CMP stands for Consent Management Provider. In simple terms, this is a service provider that obtains and processes the consent of the user, makes it available to the advertisers and, if necessary, logs it for later control. We recommend using a provider with IAB certification or CMP based on the IAB CMP Framework. A list of IAB CMPs can be found at https://iabeurope.eu/cmp-list/. AdSpirit recommends the use of www.consentmanager.de .

### List of functions that require consent

Please visit our page- https://support.adspirit.de/hc/en-us/articles/360014631659-List-of-functions-that-require-consent




#Overview

Module Name: Rise Bidder Adapter

Module Type: Bidder Adapter

Maintainer: prebid-rise-engage@risecodes.com


# Description

Module that connects to Rise's demand sources.

The Rise adapter requires setup and approval from the Rise. Please reach out to prebid-rise-engage@risecodes.com to create an Rise account.

The adapter supports Video(instream). For the integration, Rise returns content as vastXML and requires the publisher to define the cache url in config passed to Prebid for it to be valid in the auction.

# Bid Parameters
## Video

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `org` | required | String |  Rise publisher Id provided by your Rise representative  | "56f91cd4d3e3660002000033"
| `floorPrice` | optional | Number |  Minimum price in USD. Misuse of this parameter can impact revenue | 2.00
| `ifa` | optional | String |  The ID for advertisers (also referred to as "IDFA")  | "XXX-XXX"
| `placementId` | optional | String |  A unique placement identifier  | "12345678"
| `testMode` | optional | Boolean |  This activates the test mode  | false

# Test Parameters
```javascript
var adUnits = [
       {
        code: 'dfp-video-div',
        sizes: [[640, 480]],
        mediaTypes: {
          video: {
            playerSize: [[640, 480]],
            context: 'instream'
          }
        },
        bids: [{
          bidder: 'rise',
          params: {
            org: '56f91cd4d3e3660002000033', // Required
            floorPrice: 2.00, // Optional
            ifa: 'XXX-XXX', // Optional
            placementId: '12345678', // Optional
            testMode: false // Optional
          }
        }]
      }
   ];
```

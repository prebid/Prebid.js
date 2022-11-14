#Overview

Module Name: Rise Bidder Adapter

Module Type: Bidder Adapter

Maintainer: prebid-rise-engage@risecodes.com


# Description

Module that connects to Rise's demand sources.

The Rise adapter requires setup and approval from the Rise. Please reach out to prebid-rise-engage@risecodes.com to create an Rise account.

The adapter supports Video(instream).

# Bid Parameters
## Video

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `org` | required | String |  Rise publisher Id provided by your Rise representative  | "56f91cd4d3e3660002000033"
| `floorPrice` | optional | Number |  Minimum price in USD. Misuse of this parameter can impact revenue | 2.00
| `placementId` | optional | String |  A unique placement identifier  | "12345678"
| `testMode` | optional | Boolean |  This activates the test mode  | false
| `rtbDomain` | optional | String |  Sets the seller end point  | "www.test.com"

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
            placementId: '12345678', // Optional
            testMode: false // Optional,
            rtbDomain: "www.test.com" //Optional
          }
        }]
      }
   ];
```

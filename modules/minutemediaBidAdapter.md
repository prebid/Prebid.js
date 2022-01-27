#Overview

Module Name: MinuteMedia Bidder Adapter

Module Type: Bidder Adapter

Maintainer: hb@minutemedia.com


# Description

Module that connects to MinuteMedia's demand sources.

The MinuteMedia adapter requires setup and approval from the MinuteMedia. Please reach out to hb@minutemedia.com to create an MinuteMedia account.

The adapter supports Video(instream).

# Bid Parameters
## Video

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `org` | required | String |  MinuteMedia publisher Id provided by your MinuteMedia representative  | "56f91cd4d3e3660002000033"
| `floorPrice` | optional | Number |  Minimum price in USD. Misuse of this parameter can impact revenue | 2.00
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
          bidder: 'minutemedia',
          params: {
            org: '56f91cd4d3e3660002000033', // Required
            floorPrice: 2.00, // Optional
            placementId: '12345678', // Optional
            testMode: false // Optional
          }
        }]
      }
   ];
```

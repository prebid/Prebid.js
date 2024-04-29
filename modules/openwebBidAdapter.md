# Overview

Module Name: OpenWeb Bidder Adapter

Module Type: Bidder Adapter

Maintainer: monetization@openweb.com


# Description

Module that connects to OpenWeb's demand sources.

The OpenWeb adapter requires setup and approval from OpenWeb. Please reach out to monetization@openweb.com to create an OpenWeb account.

The adapter supports Video and Display demand.

# Bid Parameters
## Video

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `org` | required | String |  OpenWeb publisher Id provided by your OpenWeb representative  | "1234567890abcdef12345678"
| `floorPrice` | optional | Number |  Minimum price in USD. Misuse of this parameter can impact revenue | 2.00
| `placementId` | optional | String |  A unique placement identifier  | "12345678"
| `testMode` | optional | Boolean |  This activates the test mode  | false
| `currency` | optional | String | 3 letters currency | "EUR"


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
          bidder: 'openweb',
          params: {
            org: '1234567890abcdef12345678', // Required
            floorPrice: 2.00, // Optional
            placementId: '12345678', // Optional
            testMode: false, // Optional,
          }
        }]
      }
   ];
```
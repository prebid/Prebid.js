#Overview

Module Name: IronSource Bidder Adapter

Module Type: Bidder Adapter

Maintainer: prebid-digital-brands@ironsrc.com


# Description

Module that connects to IronSource's demand sources.

The IronSource adapter requires setup and approval from the IronSource. Please reach out to prebid-digital-brands@ironsrc.com to create an IronSource account.

The adapter supports Video(instream). For the integration, IronSource returns content as vastXML and requires the publisher to define the cache url in config passed to Prebid for it to be valid in the auction.

# Bid Parameters
## Video

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `isOrg` | required | String |  IronSource publisher Id provided by your IronSource representative  | "56f91cd4d3e3660002000033"
| `floorPrice` | optional | Number |  Minimum price in USD. Misuse of this parameter can impact revenue | 2.00
| `ifa` | optional | String |  The ID for advertisers (also referred to as "IDFA")  | "XXX-XXX"
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
          bidder: 'ironsource',
          params: {
            isOrg: '56f91cd4d3e3660002000033', // Required
            floorPrice: 2.00, // Optional
            ifa: 'XXX-XXX', // Optional
            testMode: false // Optional
          }
        }]
      }
   ];
```

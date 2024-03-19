# Overview

```
Module Name:  Publir Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@publir.com
```


# Description

Module that connects to Publir's demand sources.

The Publir adapter requires setup and approval from the Publir. Please reach out to info@publir.com to create an Publir account.

The adapter supports Video(instream).

# Bid Parameters
## Video

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `pubId` | required | String |  Publir publisher Id provided by your Publir representative  | "1234567890abcdef12345678"


# Test Parameters
```javascript
var adUnits = [
       {
        code: 'hre_div-hre-vcn-1',
        sizes: [[1080, 1920]]],
        mediaTypes: {
          banner: {
            sizes: [
              [1080, 1920],
            ],
          },
        },
        bids: [{
          bidder: 'publir',
          params: {
            pubId: '1234567890abcdef12345678'
          }
        }]
      }
   ];
```

#Overview

Module Name: STN Bidder Adapter

Module Type: Bidder Adapter

Maintainer: hb@stnvideo.com


# Description

Module that connects to STN's demand sources.

The STN adapter requires setup and approval from the STN. Please reach out to hb@stnvideo.com to create an STN account.

The adapter supports Video(instream) & Banner.

# Bid Parameters
## Video

| Name | Scope | Type | Description                                                       | Example
| ---- | ----- | ---- |-------------------------------------------------------------------| -------
| `org` | required | String | STN publisher Id provided by your STN representative              | "STN_0000013"
| `floorPrice` | optional | Number | Minimum price in USD. Misuse of this parameter can impact revenue | 2.00
| `placementId` | optional | String | A unique placement identifier                                     | "12345678"
| `testMode` | optional | Boolean | This activates the test mode                                      | true

# Test Parameters
```javascript
var adUnits = [{
        code: 'dfp-video-div',
        sizes: [
            [640, 480]
        ],
        mediaTypes: {
            video: {
                playerSize: [
                    [640, 480]
                ],
                context: 'instream'
            }
        },
        bids: [{
            bidder: 'stn',
            params: {
                org: 'STN_0000013', // Required
                floorPrice: 2.00, // Optional
                placementId: 'video-test', // Optional
                testMode: true // Optional
            }
        }]
    },
    {
        code: 'dfp-banner-div',
        sizes: [
            [640, 480]
        ],
        mediaTypes: {
            banner: {
                sizes: [
                    [640, 480]
                ]
            }
        },
        bids: [{
            bidder: 'stn',
            params: {
                org: 'STN_0000013', // Required
                floorPrice: 2.00, // Optional
                placementId: 'banner-test', // Optional
                testMode: true // Optional
            }
        }]
    }
];
```

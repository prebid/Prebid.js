#Overview

Module Name: Shinez Bidder Adapter

Module Type: Bidder Adapter

Maintainer: tech-team@shinez.io


# Description

Module that connects to Shinez's demand sources.

The Shinez adapter requires setup and approval from the Shinez. Please reach out to tech-team@shinez.io to create an Shinez account.

The adapter supports Video(instream) & Banner.

# Bid Parameters
## Video

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `org` | required | String |  Shinez publisher Id provided by your Shinez representative  | "56f91cd4d3e3660002000033"
| `floorPrice` | optional | Number |  Minimum price in USD. Misuse of this parameter can impact revenue | 2.00
| `placementId` | optional | String |  A unique placement identifier  | "12345678"
| `testMode` | optional | Boolean |  This activates the test mode  | false

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
            bidder: 'shinez',
            params: {
                org: '56f91cd4d3e3660002000033', // Required
                floorPrice: 2.00, // Optional
                placementId: 'shinez-video-test', // Optional
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
            bidder: 'shinez',
            params: {
                org: '56f91cd4d3e3660002000033', // Required
                floorPrice: 2.00, // Optional
                placementId: 'shinez-banner-test', // Optional
                testMode: true // Optional
            }
        }]
    }
];
```
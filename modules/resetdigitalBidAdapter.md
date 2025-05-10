# Overview

```
Module Name: ResetDigital Bidder Adapter
Module Type: Bidder Adapter
Maintainer: BidderSupport@resetdigital.co
```

# Description

Prebid adapter for Reset Digital. Requires approval and account setup.
Video is supported but requires a publisher supplied renderer at this time.

# Test Parameters

## Web
```
// Define the ad units for banner ads
var adUnits = [
    {
        code: 'your-div', // Replace with the actual ad unit code
        mediaTypes: {
            banner: {
                sizes: [[300, 250]] // Define the sizes for banner ads
            }
        },
        bids: [
            {
                bidder: "resetdigital",
                params: {
                    pubId: "your-pub-id", // (required) Replace with your publisher ID
                    site_id: "your-site-id", // Replace with your site ID
                    endpoint: 'https://ads.resetsrv.com', // (optional) Endpoint URL for the ad server
                    forceBid: true, // Optional parameter to force the bid
                    zoneId: { // (optional) Zone ID parameters
                        placementId: "<id>", // Optional ID used for reports
                        deals: "<deal ids>", // Optional string of deal IDs, comma-separated
                        test: 1 // Set to 1 to force the bidder to respond with a creative
                    }
                }
            }
        ]
    }
];

// Define the ad units for video ads
var videoAdUnits = [
    {
        code: 'your-div', // Replace with the actual video ad unit code
        mediaTypes: {
            video: {
                playerSize: [640, 480] // Define the player size for video ads
            }
        },
        bids: [
            {
                bidder: "resetdigital",
                params: {
                    pubId: "your-pub-id", // (required) Replace with your publisher ID
                    site_id: "your-site-id", // Replace with your site ID
                    forceBid: true, // Optional parameter to force the bid
                    zoneId: { // (optional) Zone ID parameters
                        placementId: "<id>", // Optional ID used for reports
                        deals: "<deal ids>", // Optional string of deal IDs, comma-separated
                        test: 1 // Set to 1 to force the bidder to respond with a creative
                    }
                }
            }
        ]
    }
];
```

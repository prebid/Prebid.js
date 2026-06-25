# Overview

```
Module Name: The Trade Desk Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid-maintainers@thetradedesk.com
```

# Description

Module that connects to The Trade Desk's demand sources to fetch bids.

The Trade Desk bid adapter supports Banner and Video.

# Configuration

## Endpoint compression (GZIP)

GZIP compression of the outgoing bid request is **disabled by default**. Publishers can opt in
via bidder-specific configuration:

```js
pbjs.setBidderConfig({
    bidders: ['ttd'],
    config: {
        gzipEnabled: true
    }
});
```

`gzipEnabled` accepts a boolean (`true`/`false`) or the equivalent string. Any other/invalid value
falls back to the default (disabled). Compression is automatically skipped when Prebid debug mode is
enabled or when the browser does not support GZIP.

# Test Parameters

```js
    var adUnits = [
            // Banner adUnit with only required parameters
            {
                code: 'test-div-minimal',
                mediaTypes: {
                    banner: {
                        sizes: [[300, 250]]
                    }
                },
                bids: [
                    {
                        bidder: 'ttd',
                        params: {
                            supplySourceId: 'supplier',
                            publisherId: '1427ab10f2e448057ed3b422'
                        }
                    }
                ]
            },
            // Banner adUnit with all optional parameters provided
            {
                code: 'test-div-banner-optional-params',
                mediaTypes: {
                    banner: {
                        sizes: [[728, 90]],
                        pos: 1
                    }
                },
                bids: [
                    {
                        bidder: 'ttd',
                        params: {
                            supplySourceId: 'supplier',
                            publisherId: '1427ab10f2e448057ed3b422',
                            placementId: '/1111/home#header',
                            bidfloor: 0.45,
                            banner: {
                                expdir: [1, 3]
                            },
                            customBidderEndpoint: 'https://customBidderEndpoint/bid/bidder/',
                        }
                    }
                ]
            },
            // Video adUnit with only required parameters
            {
                code: 'test-div-video-minimal',
                mediaTypes: {
                    video: {
                        maxduration: 30,
                        api: [1, 3],
                        mimes: ['video/mp4'],
                        placement: 3,
                        protocols: [2,3,5,6]
                    }
                },
                bids: [
                    {
                        bidder: 'ttd',
                        params: {
                            supplySourceId: 'supplier',
                            publisherId: '1427ab10f2e448057ed3b422'
                        }
                    }
                ]
            },
            // Video adUnit with all optional parameters provided
            {
                code: 'test-div-video-full',
                mediaTypes: {
                    video: {
                        minduration: 1,
                        maxduration: 10,
                        playerSize: [640, 480],
                        api: [1, 3],
                        mimes: ['video/mp4'],
                        placement: 3,
                        protocols: [2, 3, 5, 6],
                        startdelay: 1,
                        playbackmethod: [1],
                        pos: 1,
                        minbitrate: 100,
                        maxbitrate: 500,
                        skip: 1,
                        skipmin: 5,
                        skipafter: 10
                    }
                },
                bids: [
                    {
                        bidder: 'ttd',
                        params: {
                            supplySourceId: 'supplier',
                            publisherId: '1427ab10f2e448057ed3b422',
                            placementId: '/1111/home#header',
                            bidfloor: 0.45,
                            customBidderEndpoint: 'https://customBidderEndpoint/bid/bidder/',
                        }
                    }
                ]
            }
        ];
```

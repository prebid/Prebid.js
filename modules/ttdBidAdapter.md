# Overview

```
Module Name: The Trade Desk Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid-maintainers@thetradedesk.com
```

# Description

Module that connects to The Trade Desk's demand sources to fetch bids.

The Trade Desk bid adapter supports Banner and Video.

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

# Failover

If a request to the bidder endpoint fails quickly with a network error (for example a DNS resolution failure or a blocked domain), the adapter retries it once on a failover domain. Timeouts and HTTP error responses (any non-2xx status) are never retried. Only failures that occur within one second of sending the request are retried.

The failover is enabled by default and can be configured with the following optional bid params:

| Param | Type | Default | Description |
|---|---|---|---|
| `failoverEnabled` | boolean | `true` | Set to `false` to disable the failover. |
| `failoverDomain` | string | `bid-openpath.ttdcdn.org` | Hostname (no scheme or path) to retry on. The rest of the request URL is unchanged. An invalid value is ignored and the default is used. |

Note that the failover also applies when `customBidderEndpoint` is set; the retry is sent to `failoverDomain` with the same path.

```js
params: {
    supplySourceId: 'supplier',
    publisherId: '1427ab10f2e448057ed3b422',
    failoverEnabled: true,
    failoverDomain: 'bid.example.com'
}
```

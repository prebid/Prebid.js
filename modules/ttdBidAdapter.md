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

If a request to the bidder endpoint fails quickly with a network error (for example a DNS resolution failure or a blocked domain), the adapter retries it once on a failover domain. Timeouts and HTTP error responses (any non-2xx status) are never retried. Only failures that occur within 100 milliseconds of sending the request are retried.

After a request has been retried, every later request is sent straight to the failover domain, without trying the original host first. This is only remembered in memory, so it lasts until the page is reloaded. Setting `failoverEnabled` to `false` turns this off as well.

The failover is enabled by default and can be configured with the following optional bid params:

| Param | Type | Default | Description |
|---|---|---|---|
| `failoverEnabled` | boolean | `true` | Set to `false` to disable the failover. |
| `failoverDomain` | string | `bid-openpath.ttdcdn.org` | Hostname (no scheme or path) to retry on. The rest of the request URL is unchanged. An invalid value is ignored and the default is used. |

## How the retry URL is built

The retry is sent to the same URL as the original request with only the host replaced. The scheme, path and query string are kept, and any port is dropped. The host is `failoverDomain` if you set a valid one, otherwise `bid-openpath.ttdcdn.org`.

This also applies when `customBidderEndpoint` is set. The original request URL is `customBidderEndpoint` followed by `supplySourceId`, and during a failover retry only the domain is replaced. The scheme, path and query string are kept, and any port is dropped.

In the examples below `supplySourceId` is `supplier`:

| `customBidderEndpoint` | `failoverDomain` | Request URL | Retried on |
|---|---|---|---|
| not set | not set | `https://direct.adsrvr.org/bid/bidder/supplier` | `https://bid-openpath.ttdcdn.org/bid/bidder/supplier` |
| not set | `bid.example.com` | `https://direct.adsrvr.org/bid/bidder/supplier` | `https://bid.example.com/bid/bidder/supplier` |
| `https://proxy.example.com/bid/bidder/` | not set | `https://proxy.example.com/bid/bidder/supplier` | `https://bid-openpath.ttdcdn.org/bid/bidder/supplier` |
| `https://proxy.example.com/bid/bidder/` | `proxy-backup.example.com` | `https://proxy.example.com/bid/bidder/supplier` | `https://proxy-backup.example.com/bid/bidder/supplier` |
| `https://proxy.example.com:8443/prefix/bid/bidder/` | `proxy-backup.example.com` | `https://proxy.example.com:8443/prefix/bid/bidder/supplier` | `https://proxy-backup.example.com/prefix/bid/bidder/supplier` |

Other cases where a request is not retried:

- The failover domain is the host that just failed.
- The request timed out, or the server answered with an HTTP error status (see above).
- The retry itself fails. The error is reported as usual and the request is not retried again.

### Examples

Use the defaults. Nothing needs to be set:

```js
params: {
    supplySourceId: 'supplier',
    publisherId: '1427ab10f2e448057ed3b422'
}
```

Retry on a `failoverDomain` supplied by TTD:

```js
params: {
    supplySourceId: 'supplier',
    publisherId: '1427ab10f2e448057ed3b422',
    failoverDomain: 'bid.example.com'
}
```

Custom endpoint with a `failoverDomain` supplied by TTD:

```js
params: {
    supplySourceId: 'supplier',
    publisherId: '1427ab10f2e448057ed3b422',
    customBidderEndpoint: 'https://proxy.example.com/bid/bidder/',
    failoverDomain: 'proxy-backup.example.com'
}
```

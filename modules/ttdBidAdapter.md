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
                            publisherId: '1427ab10f2e448057ed3b422',
                            siteId: 'site-123',
                            placementId: 'footer1'
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
                            siteId: 'site-123',
                            placementId: 'footer1',
                            banner: {
                                expdir: [1, 3]
                            },
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
                            publisherId: '1427ab10f2e448057ed3b422',
                            siteId: 'site-123',
                            placementId: 'footer1'
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
                            siteId: 'site-123',
                            placementId: 'footer1'
                        }
                    }
                ]
            }
        ];
```

# Overview

```
Module Name: Dianomi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid-maintainer@dianomi.com
```

# Description

Module that connects to Dianomi's demand sources. Both Native and Banner formats supported. Using oRTB standard.

# Test Parameters

```js
    var adUnits = [
        {
            code: '/19968336/prebid_native_example_1',
            mediaTypes: {
                native: {
                    rendererUrl: "https://dev.dianomi.com/chris/prebid/dianomiRenderer.js",
                    image: {
                        required: true,
                        sizes: [360, 360]
                    },
                    title: {
                        required: true,
                        len: 800
                    },
                    sponsoredBy: {
                        required: true
                    },
                    clickUrl: {
                        required: true
                    },
                    privacyLink: {
                        required: false
                    },
                    body: {
                        required: false
                    },
                    icon: {
                        required: false,
                        sizes: [75, 75]
                    },
                }
            },
            bids: [
                {
                    bidder: "dianomi",
                    params: {
                        smartadId: 9607   // required
                    }
                }
            ]
        },{
            code: '/19968336/prebid_banner_example_1',
            mediaTypes: {
                banner: {
                    sizes: [750, 650],   // a below-article size
                }
            },
            bids: [
                {
                    bidder: "dianomi",
                    params: {
                        smartadId: 9528,  // required
                    }
                }
            ]
        }
    ];
```
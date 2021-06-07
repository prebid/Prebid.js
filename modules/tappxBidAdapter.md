# Overview
```
Module Name: Tappx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@tappx.com
```

# Description
Module that connects to :tappx demand sources.
Please use ```tappx``` as the bidder code.
Ads sizes available: [320,50], [300,250], [320,480], [1024,768], [728,90]

# Banner Test Parameters
```
    var adUnits = [
            {
                code: 'banner-ad-div',
                mediaTypes: {
                    banner: {
                        sizes: [[320,50]]
                    }
                },
                bids: [
                    {
                        bidder: "tappx",
                        params: {
                            host: "testing.ssp.tappx.com/rtb/v2/",
                            tappxkey: "pub-1234-android-1234",
                            endpoint: "ZZ1234PBJS",
                            bidfloor: 0.005,
                            test: true // Optional for testing purposes
                        }
                    }
                ]
            }
    ];
```

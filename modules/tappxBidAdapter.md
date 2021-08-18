# Overview
```
Module Name: Tappx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@tappx.com
```

# Description
Module that connects to :tappx demand sources.
Suppots Banner and Instream Video.
Please use ```tappx``` as the bidder code.
Ads sizes available: [300,250], [320,50], [320,480], [480,320], [728,90], [768,1024], [1024,768]

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


# Video Test Parameters
```
    var adUnits = [
        {
            code: 'video-ad-div',
            renderer: {
                options: {
                    text: "Tappx instream Video"
                    }
            },
            mediaTypes: {
                video: {
                    context: "instream",
                    mimes : [ "video/mp4", "application/javascript" ],
                    playerSize: [320, 250]
                }
            },
            bids: [{
                bidder: 'tappx',
                params: {
                    host: "testing.ssp.tappx.com/rtb/v2/",
                    tappxkey: "pub-1234-desktop-1234",
                    endpoint: "VZ12TESTCTV",
                    bidfloor: 0.005,
                    test: true,
                    video: {
                        skippable: true,                      // optional
                        minduration: 5,                       // optional
                        maxduration: 30,                      // optional
                        startdelay: 5,                        // optional
                        playbackmethod: [1,3],                // optional
                        api: [ 1, 2 ],                        // optional
                        protocols: [ 2, 3 ],                  // optional
                        battr: [ 13, 14 ],                    // optional
                        linearity: 1,                         // optional
                        placement: 2,                         // optional
                        minbitrate: 10,                       // optional
                        maxbitrate: 10                        // optional
                    }
                }
            }]
        }
    ];
```

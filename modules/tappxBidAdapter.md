# Overview
```
Module Name: Tappx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@tappx.com
```

# Description
Module that connects to :tappx demand sources.
Suppots Banner and Video (instream and outstream).
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
                            mktag: "123456",                // Optional: tappx mktag
                            test: true,                     // Optional: for testing purposes
                            domainUrl: "www.example.com",   // Optional: add domain site
                            ext: {                          // Optional: extra params
                                foo: "bar"
                            }
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
                    context: %CONTEXT%,             // Could be "instream" or "outstream"
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
                    mktag: "123456",                // Optional: tappx mktag
                    test: true,                     // Optional: for testing purposes
                    domainUrl: "www.example.com",   // Optional: add domain site
                    video: {                        // Optional
                        skippable: true,            // Optional
                        minduration: 5,             // Optional
                        maxduration: 30,            // Optional
                        startdelay: 5,              // Optional
                        playbackmethod: [1,3],      // Optional
                        api: [ 1, 2 ],              // Optional
                        protocols: [ 2, 3 ],        // Optional
                        battr: [ 13, 14 ],          // Optional
                        linearity: 1,               // Optional
                        placement: 2,               // Optional
                        minbitrate: 10,             // Optional
                        maxbitrate: 10              // Optional
                    },
                    ext: {                          // Optional: extra params
                                foo: "bar"
                            }
                }
            }]
        }
    ];
```

# Overview

```
Module Name: STV Video Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@dspx.tv
```

# Description

STV video adapter for Prebid.js 1.x

# Parameters
```
    var adUnits = [
        {
            // video settings
            code: 'video-obj',
            mediaTypes: {
                video: {
                    context: 'instream',
                    playerSize: [640, 480]
                }
            },
            bids: [
                {
                    bidder: "stv",
                    params: {
                        placement: "", // placement ID of inventory with STV
                        noskip: 1, // 0 or 1 
                        pfilter: {/*
                            min_duration: 10, // min duration
                            max_duration: 30, // max duration
                            min_bitrate:  300, // min bitrate
                            max_bitrate:  1600, // max bitrate
                        */}
                    }
                 }
            ]
        }
    ];
```


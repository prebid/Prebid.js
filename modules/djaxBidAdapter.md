# Overview

```
Module Name: Djax Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@djaxtech.com
```

# Description

Module that connects to Djax

Djax Bidder Adapter supports banner, video (both instream and outstream).
# Test Parameters
```
    var adUnits = [
        {
            //Banner ad unit
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
               {
                   bidder: "djax",
                   params: {
                        publisherId: '2' // string - required
                    }
               }
           ]
        },
        {
            //Instream video
            code: 'vid989636',
            mediaTypes: {
                video: {
                   playerSize: [[480, 320]],  // a display size
                }
            },
            bids: [
               {
                   bidder: "djax",
                   params: {
                        publisherId: '12' // string - required
                    }
               }
           ]
        },
        {
            //Outstream video
		    code: "video-div",
		    mediaTypes: {
			    video: {
				    playerSize: [640, 480],
				    context: "outstream",
				    mimes: ["video/mp4"],
				    playbackmethod: [2]
			    }
		    },
		    bids: [
                {
                    "bidder":"djax",
                    "params":{
                        "publisherId":"4"
                    }
                }
            ]
        }
    ];

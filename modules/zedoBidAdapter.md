# Overview

Module Name: ZEDO Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebidsupport@zedo.com

# Description

Module that connects to ZEDO's demand sources.

ZEDO supports both display and video. 
For video integration, ZEDO returns content as vastXML and requires the publisher to define the cache url in config passed to Prebid for it to be valid in the auction

ZEDO has its own renderer and will render the video unit if not defined in the config. 


# Test Parameters
# display
```

    var adUnits = [{
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250], [300,600]],
                }
            },
            // Replace this object to test a new Adapter!
            bids: [{
                bidder: 'zedo',
                params: {
                    channelCode: 2264004735, //REQUIRED 
                    dimId:9 //REQUIRED
                }
            }]

        }];
```
# video
```

    var adUnit1 = [
    {   
        code: 'videoAdUnit', 
        mediaTypes: 
        { 
            video: 
            { 
                context: 'outstream', 
                playerSize: [640, 480]
            }
        },
        bids: [
            { 
                bidder: 'zedo', 
                params: 
                { 
                    channelCode: 2264004735, // required
                    dimId: 85, // required
                    pubId: 1 // optional
                } 
            }
        ]
    }];
```
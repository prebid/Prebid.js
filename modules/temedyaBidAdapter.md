# Overview

Module Name: TE Medya Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@temedya.com

# Description

Module that connects to TE Medya's demand sources.

TE Medya supports Native. 


# Test Parameters
# native
```

    var adUnits = [
        {
            code:'tme_div_id',
            mediaTypes:{
                native: {
                    title: {
                        required: true
                    },
                    icon: {
                        required: true,
                        size: [320 , 240]
                    }
                }
            },
            bids:[
                {
                    bidder: 'temedya',
                    params: {
                        widgetId: 753497,
                        count: 1
                    }
                }
            ]
        }
    ];
```
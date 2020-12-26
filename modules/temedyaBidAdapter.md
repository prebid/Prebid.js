# Overview

Module Name: TE Medya Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@temedya.com

# Description

Module that connects to TE Medya's demand sources.

TE Medya supports Native and Banner. 


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
# Test Parameters
# banner
```

    var adUnits = [
        {
            code:'tme_div_id',
            mediaTypes:{
                banner: {
                    banner: {
                        sizes:[300, 250]
                    }
                }
            },
            bids:[
                {
                    bidder: 'temedya',
                    params: {
                        widgetId: 753497
                    }
                }
            ]
        }
    ];
```
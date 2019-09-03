# Overview

```
Module Name: Datablocks Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@datablocks.net
```

# Description

Connects to Datablocks Version 5 Platform
Banner Native and 


# Test Parameters
```
    var adUnits = [
      {
        code: 'banner-div',
        sizes: [[300, 250]],
        mediaType:{
        	banner: {
        		sizes: [300,250]
        	}
        },
        bids: [
          {
            bidder: 'datablocks',
            params: {
              sourceId: 12345,
              host: 'prebid.datablocks.net'
            }
          }
        ]
      }, {
        code: 'native-div',
        bids: [
          {
            bidder: 'datablocks',
            mediaType : {
            	native: {
            		title:{required:true},
            		body:{required:true}
            	}
            },
            params: {
              sourceId: 12345,
              host: 'prebid.datablocks.net'
            }
          }
        ]
      }
    ];
```
# Overview

```
Module Name: Datablocks Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@datablocks.net
```

# Description

Connects to Datablocks Version 5 Platform
Banner Native and Video


# Test Parameters
```
    var adUnits = [
      {
        code: 'banner-div',
        sizes: [[300, 250]],
        mediaTypes:{
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
        mediaTypes : {
          native: {
            title:{required:true},
            body:{required:true}
          }
        },
        bids: [
          {
            bidder: 'datablocks',
            params: {
              sourceId: 12345,
              host: 'prebid.datablocks.net'
            }
          }, {
        code: 'video-div',
        mediaTypes : {
          video: {
            playerSize:[500,400],
            durationRangeSec:[15,30],
            context: "linear"
          }
        },
        bids: [
          {
            bidder: 'datablocks',
            params: {
              sourceId: 12345,
              host: 'prebid.datablocks.net',
              video: {
                mimes:["video/flv"]
              }
            }
          }
        ]
      }
    ];
```
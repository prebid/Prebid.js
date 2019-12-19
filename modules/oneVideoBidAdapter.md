# Overview

**Module Name**: One Video Bidder Adapter
**Module Type**: Bidder Adapter  
**Maintainer**: deepthi.neeladri.sravana@verizonmedia.com

# Description

Connects to One Video demand source to fetch bids.


# Test Parameters for Video
```
    var adUnits = [

	{
      code: 'video1',
        sizes: [640,480],
        mediaTypes: {
          video: {
            context: "instream"
          }
        },
        bids: [
          {
            bidder: 'oneVideo',
            params: {
              video: {
                playerWidth: 480,
                playerHeight: 640,
                mimes: ['video/mp4', 'application/javascript'],
                protocols: [2,5],
                api: [2],
                position: 1,
                delivery: [2],
                playbackmethod: [1,5],
                sid: <scpid>,
                rewarded: 1,
                placement: 1,
                inventoryid: 123
               },
               site: {
                  id: 1,
                  page: 'http://abhi12345.com',
                  referrer: 'http://abhi12345.com'
                },
               pubId: 'brxd'
              }
           }
        ]
    }
]
```
# Test Parameters for banner request
```
    var adUnits = [
        {
            code: 'video1',
              sizes: [640,480],
              mediaTypes: {
                video: {
                  context: "instream"
                }
              },
              bids: [
                {
                  bidder: 'oneVideo',
                  params: {
                    video: {
                      playerWidth: 480,
                      playerHeight: 640,
                      mimes: ['video/mp4', 'application/javascript'],
                      position: 1,
                      display: 1
                    },
                    site: {
                      id: 1,
                      page: 'http://abhi12345.com',
                      referrer: 'http://abhi12345.com'
                    },
                    pubId: 'OneMDisplay'
                  }
                }
            ]
       }
]
```

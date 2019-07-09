# Overview

**Module Name**: One Video Bidder Adapter
**Module Type**: Bidder Adapter  
**Maintainer**: ankur.modi@oath.com

# Description

Connects to One Video demand source to fetch bids.


# Test Parameters
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
                placement: 123
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
	];
```

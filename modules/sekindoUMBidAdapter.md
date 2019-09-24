# Overview

**Module Name**: sekindoUM Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: nissime@sekindo.com  

# Description

Connects to Sekindo (part of UM) demand source to fetch bids.  
Banner, Outstream and Native formats are supported.  


# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'sekindoUM',
          params: { 
              spaceId: 14071
			  width:300, ///optional
			  height:250, //optional
          }
      }]
    },
	{
      code: 'video-ad-div',
      sizes: [[640, 480]],
      bids: [{
          bidder: 'sekindoUM',
          params: { 
              spaceId: 87812,
			  video:{ 
				playerWidth:640,
				playerHeight:480,
				vid_vastType: 5 //optional
			  }
          }
      }]
    }
	];
```

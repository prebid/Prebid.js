# Overview

```
Module Name: LunaMedia Bidder Adapter
Module Type: Bidder Adapter
Maintainer: lokesh@advangelists.com
```

# Description

Connects to LunaMedia exchange for bids.

LunaMedia bid adapter supports Banner and Video ads currently.

For more informatio

# Sample Display Ad Unit: For Publishers
```javascript

var displayAdUnit = [
{
    code: 'display',
    mediaTypes: {
        banner: {
            sizes: [[300, 250],[320, 50]]
        }
    }
    bids: [{
        bidder: 'lunamedia',
        params: {
            pubid: '121ab139faf7ac67428a23f1d0a9a71b',
            placement: 1234
        }
    }]
}];
```

# Sample Video Ad Unit: For Publishers
```javascript

var videoAdUnit = {
	code: 'video',
	sizes: [320,480],
	mediaTypes: {
	  video: {
	  	playerSize : [[320, 480]], 
	  	context: 'instream'
	  }
	},
    bids: [
      {
      	bidder: 'lunamedia',
      	params: {
        	pubid: '121ab139faf7ac67428a23f1d0a9a71b',
        	placement: 1234,
        	video: {
            	id: 123,
            	skip: 1,
            	mimes : ['video/mp4', 'application/javascript'],
            	playbackmethod : [2,6],
            	maxduration: 30
          	}
      	}
      }
    ]
  };
```
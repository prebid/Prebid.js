# Overview

```
Module Name: Advangelists Bidder Adapter
Module Type: Bidder Adapter
Maintainer: lokesh@advangelists.com
```

# Description

Connects to Advangelists exchange for bids.

Advangelists bid adapter supports Banner and Video ads currently.

For more informatio

# Sample Display Ad Unit: For Publishers
```javascript
var displayAdUnit = [
{
    code: 'display',
    sizes: [
        [300, 250],
        [320, 50]
    ],
    bids: [{
        bidder: 'advangelists',
        params: {
            pubid: '0cf8d6d643e13d86a5b6374148a4afac',
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
      	bidder: 'advangelists',
      	params: {
        	pubid: '8537f00948fc37cc03c5f0f88e198a76',
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
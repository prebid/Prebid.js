# Overview

Module Name: pubx Bid Adapter

Maintainer: x@pub-x.io

# Description

Module that connects to Pub-X's demand sources
Supported MediaTypes: banner only

# Test Parameters
```javascript
	var adUnits = [
    {
      code: 'test',
      mediaTypes: {
        banner: {
          sizes: [300,250]
        }
      },
      bids: [
        {
          bidder: 'pubx',
          params: {
            sid: 'eDMR' //ID should be provided by Pub-X
          }
        }
      ]
    }
  ];
```
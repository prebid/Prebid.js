# Overview

Module Name: 7xbid Bid Adapter

Maintainer: 7xbid.com@gmail.com

# Description

Module that connects to 7xbid's demand sources

# Test Parameters
```javascript
	var adUnits = [
    {
      code: 'test',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300,600]],
        }
      },
      bids: [
        {
          bidder: '7xbid',
          params: {
            placementId: 1425292,
            currency: 'USD'
          }
        }
      ]
    },
    {
      code: 'test',
      mediaTypes: {
        native: {
          title: {
            required: true,
            len: 80
          },
          image: {
            required: true,
            sizes: [150, 50]
          },
          sponsoredBy: {
            required: true
          }
        }
      },
      bids: [
        {
          bidder: '7xbid',
          params: {
            placementId: 1429695,
            currency: 'USD'
          }
        },
      ],
    }
  ];
```
# Overview

Module Name: SMMS Bid Adapter

Maintainer: SBBGRP-SSP-PMP@g.softbank.co.jp

# Description

Module that connects to softbank's demand sources

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
          bidder: 'smms',
          params: {
            placementId: 1440837,
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
          bidder: 'smms',
          params: {
            placementId: 1440838,
            currency: 'USD'
          }
        },
      ],
    }
  ];
```

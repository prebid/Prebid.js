# Media Consortium Bid adapter

## Overview

```
- Module Name: Media Consortium Bidder Adapter
- Module Type: Media Consortium Bidder Adapter
- Maintainer: mediaconsortium-develop@bi.garage.co.jp
```

## Description

Module that connects to Media Consortium demand sources and supports the following media types: `banner`, `video`.

To get access to the full feature set of the adapter you'll need to allow localstorage usage in the `bidderSettings`.

```javascript
    pbjs.bidderSettings = {
        mediaConsortium: {
            storageAllowed: true
        }
    }
```

## Managing 1plusX profile API usage and FPID retrieval

You can use the `setBidderConfig` function to enable or disable 1plusX profile API usage and fpid retrieval.

If the keys found below are not defined, their values will default to `false`.

```javascript
    pbjs.setBidderConfig({
        bidders: ['mediaConsortium'],
        config: {
            // Controls the 1plusX profile API usage
            useProfileApi: true,
            // Controls the 1plusX fpid retrieval
            readOnePlusXId: true
        }
    });
```

## Test Parameters

```javascript
    var adUnits = [
        {
            code: 'div-prebid-banner',
            mediaTypes:{
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids:[
                {
                    bidder: 'mediaConsortium',
                    params: {}
                }
            ]
        },
        {
            code: 'div-prebid-video',
            mediaTypes:{
                video: {
                    playerSize: [
                        [300, 250]
                    ],
                    context: 'outstream'
                }
            },
            bids:[
                {
                    bidder: 'mediaConsortium',
                    params: {
                        video: {
                            // videoParams, see player for a full list of available parameters
                        }
                    }
                }
            ]
        }
    ];
```

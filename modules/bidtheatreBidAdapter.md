# Overview

```
Module Name : Bidtheatre Bidder Adapter
Module Type : Bidder Adapter
Maintainer  : operations@bidtheatre.com
```

# Description

Module that connects to Bidtheatre's demand sources

About us: https://www.bidtheatre.com

The Bidtheatre Bidding adapter requires manual set up before use. Please contact us at [operations@bidtheatre.com](mailto:operations@bidtheatre.com) if you would like to access Bidtheatre demand.

# Bid params
| Name          | Scope    | Description                            | Example                              |
|:--------------| :------- |:---------------------------------------|:-------------------------------------|
| `publisherId` | required | Manually set up publisher ID | `73b20b3a-12a0-4869-b54e-8d42b55786ee`|

In addition to the required bid param above, Bidtheatre will also enforce the following requirements
- All ad slots on a page must belong to the same publisher ID
- The publisher must provide either a client IP and/or explicit geo data in the request

# Test Parameters

## Banner

```javascript
var displayAdUnits = [
    {
        code: 'test-banner',
        mediaTypes: {
            banner: {
                sizes: [[980,240]]
            }
        },
        bids: [
            {
                bidder: 'bidtheatre',
                params: {
                    publisherId: '73b20b3a-12a0-4869-b54e-8d42b55786ee'
                }
            }
        ]
    }
];
```

## Video

```javascript
var videoAdUnits = [
    {
        code: 'test-video',
        mediaTypes: {
            video: {
                playerSize: [[1280, 720]]
            }
        },
        bids: [
            {
                bidder: 'bidtheatre',
                params: {
                    publisherId: '73b20b3a-12a0-4869-b54e-8d42b55786ee'
                }
            }
        ]
    }
];
```

## Multiformat

```javascript
var adUnits = [
    {
        code: 'test-banner',
        mediaTypes: {
            banner: {
                sizes: [[980,240]]
            }
        },
        bids: [
            {
                bidder: 'bidtheatre',
                params: {
                    publisherId: '73b20b3a-12a0-4869-b54e-8d42b55786ee'
                }
            }
        ]
    },
    {
        code: 'test-video',
        mediaTypes: {
            video: {
                playerSize: [[1280, 720]]
            }
        },
        bids: [
            {
                bidder: 'bidtheatre',
                params: {
                    publisherId: '73b20b3a-12a0-4869-b54e-8d42b55786ee'
                }
            }
        ]
    }
];
```

# Overview

```markdown
Module Name: A1Media Bid Adapter
Module Type: Bidder Adapter
Maintainer: dev@a1mediagroup.co.kr
```

# Description

Connects to A1Media exchange for bids.

# Test Parameters

## Sample Banner Ad Unit

```javascript
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[320, 100]],
            }
        },
        bids: [
            {
                bidder: "a1media",
                params: {
                    bidfloor: 0.9,      //optional
                    currency: 'JPY'     //optional
                    battr: [ 13 ],      //optional
                    bcat: ['IAB1-1']    //optional
                }
            }
        ]
    }
]
```

## Sample Video Ad Unit

```javascript
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            video: {
                mimes: ['video/mp4'],
            }
        },
        bids: [
            {
                bidder: "a1media",
                params: {
                    bidfloor: 0.9,      //optional
                    currency: 'JPY'     //optional
                    battr: [ 13 ],      //optional
                    bcat: ['IAB1-1']    //optional
                }
            }
        ]
    }
]
```

## Sample Native Ad Unit

```javascript
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            native: {
                title: {
                    len: 140
                },
            }
        },
        bids: [
            {
                bidder: "a1media",
                params: {
                    bidfloor: 0.9,      //optional
                    currency: 'JPY'     //optional
                    battr: [ 13 ],      //optional
                    bcat: ['IAB1-1']    //optional
                }
            }
        ]
    }
]
```

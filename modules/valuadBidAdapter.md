# Overview

**Module Name**: Valuad Bid Adapter
**Module Type**: Bidder Adapter
**Maintainer**: natan@valuad.io

# Description


Module that connects to Valuad.io demand sources.
Valuad bid adapter supports Banner format only.

# Test Parameters

```js
    const adUnits = [{
        code: 'valuad-test-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'valuad',
            params: {
                placementId: '1000', // REQUIRED
            }
        }]
    }];
```

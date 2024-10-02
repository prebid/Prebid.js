# Overview
```
Module Name: djax Analytics Adapter
Module Type: Analytics Adapter
Maintainer: support@djaxtech.com
```

### Usage

The djax analytics adapter can be used by all clients . 

### Example Configuration

```javascript
pbjs.enableAnalytics({
    provider: 'djax',
    options: {
         options: {
        url: 'https://example.com',  // change your end point url to fetch the tracked information
    }
});


// Based on events 
pbjs.enableAnalytics({
    provider: 'djax',
    options: {
        url: 'https://example.com',
        batchSize: 10,
        events: {
            bidRequested(request) {
                return {
                    type: 'REQUEST',
                    auctionId: request.auctionId,
                    bidder: request.bidderCode
                }
            },
            bidResponse(response) {
                return {
                    type: 'RESPONSE',
                    auctionId: response.auctionId,
                    bidder: response.bidderCode
                }
            }
        }
    }
})
```

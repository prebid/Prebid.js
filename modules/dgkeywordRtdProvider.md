 ## Integration

1) Compile the Digital Garage Keyword Module and Appnexus Bid Adapter into your Prebid build:  

```
gulp build --modules="dgkeywordRtdProvider,appnexusBidAdapter,..."  
```

2) Use `setConfig` to instruct Prebid.js to initilize the dgkeyword module, as specified below.  

## Configuration

This module is configured as part of the `realTimeData.dataProviders`  

```javascript
var DGKEYWORD_TIMEOUT = 1000;
pbjs.setConfig({
    realTimeData: {
        auctionDelay: DGKEYWORD_TIMEOUT,
        dataProviders: [{
            name: 'dgkeyword',
            waitForIt: true,
            params: {
                timeout: DGKEYWORD_TIMEOUT
            }
        }]
    }
});
```

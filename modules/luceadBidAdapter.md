# Lucead Bid Adapter

- Module Name: Lucead Bidder Adapter
- Module Type: Bidder Adapter
- Maintainer: prebid@lucead.com

## Description

Module that connects to Lucead demand source to fetch bids.

In order to use this adapter, you also need to include the Lucead RTD Provider module into your Prebid build.

## Adapter configuration

Here is the configuration you need to add to your Prebid integration, in order to use this adapter:

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [
            {
                name: 'lucead',
                waitForIt: true,
            },
        ],
    },
});
```

## Ad units parameters

### Type definition

```typescript
type Params = {
    placementId: string;
    region?: 'eu' | 'us' | 'ap';
};
```

### Example code
```javascript
const adUnits=[
    {
        code:'test-div',
        sizes:[[300,250]],
        bids:[
            {
                bidder:'lucead',
                params:{
                    placementId:'1',
                    region:'us', // optional: 'eu', 'us', 'ap'
                }
            }
        ]
    }
];
```

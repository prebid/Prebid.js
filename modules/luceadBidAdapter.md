# Lucead Bid Adapter

- Module Name: Lucead Bidder Adapter
- Module Type: Bidder Adapter
- Maintainer: prebid@lucead.com

## Description

Module that connects to Lucead demand source.

## Adapter configuration

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
                bidder: 'lucead',
                params:{
                    placementId: '1',
                    region: 'us', // optional: 'eu', 'us', 'ap'
                }
            }
        ]
    }
];
```

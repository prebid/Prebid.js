# PubMatic Analytics Adapter

```
Module Name:  PubMatic Analytics Adapter
Module Type:  Analytics Adapter
Maintainer: header-bidding@pubmatic.com
```

## How to configure?
```
pbjs.enableAnalytics({
    provider: 'pubmatic',
    options: {
        "publisherId": 12345 // please contact PubMatic to get a publisherId for yourself
    }
});
```

## Limitations:
- Supports only Banner and Video media-type
- Does not supports Native media type
- Does not supports instream-video creative-render tracker
- BidCpmAdjustment: Bid CPM only after BidCpmAdjustment is logged
- If a currency module is NOT included and a bidder responds in a non-USD currency then PubMatic analytics bidder will not be able to log the bid CPM
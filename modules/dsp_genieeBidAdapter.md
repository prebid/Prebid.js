# Overview

```markdown
Module Name:  Geniee Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   dsp_back@geniee.co.jp
```

# Description
This is [Geniee](https://geniee.co.jp) Bidder Adapter for Prebid.js.

Please contact us before using the adapter.

We will provide ads when satisfy the following conditions:

- There are a certain number bid requests by zone
- The request is a Banner ad
- Payment is possible in Japanese yen or US dollars
- The request is not for GDPR or COPPA users

Thus, even if the following test, it will be no bids if the request does not reach a certain requests.

# Test AdUnits
```javascript
var adUnits={
    code: 'geniee-test-ad',
    bids: [{
        bidder: 'dsp_geniee',
        params: {
            test: 1,
        }
    }],
    mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
    }
};
```

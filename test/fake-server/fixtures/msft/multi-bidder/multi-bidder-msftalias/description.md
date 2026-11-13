Test Page - 'test/pages/multiple_bidders.html'
Test Spec File - 'test/spec/e2e/multi-bidder/e2e_multiple_bidders.spec.js'

The request sent by `msftalias`, which the page registers with `pbjs.aliasBidder('msft', 'msftalias')`. An alias sends to the endpoint of the bidder it aliases, so this pair lives in the `msft` group.

Ad Unit that generates the given 'Request' - 'Response' pair.

```(javascript)
[{
  code: 'div-banner-native-2',
  mediaTypes: {
    native: {
      title: { required: true },
      image: { required: true },
      sponsoredBy: { required: true },
    }
  },
  bids: [{
    bidder: 'msftalias',
    params: {
      placement_id: 13232392
    }
  }]
}]
```

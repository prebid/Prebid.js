Test Pages:
  - 'test/pages/banner.html'
  - 'test/pages/banner_sync.html'
Test Spec File - 'test/spec/e2e/banner/basic_banner_ad.spec.js'

One banner bid (cpm 0.50) per imp.

Ad Units that generate the given 'Request' - 'Response' pair.

```(javascript)
[{
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]],
    }
  },
  bids: [{
    bidder: 'msft',
    params: {
      placement_id: 13144370
    }
  }]
}, {
  code: 'div-gpt-ad-1460505748561-1',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]],
    }
  },
  bids: [{
    bidder: 'msft',
    params: {
      placement_id: 13144370
    }
  }]
}]
```

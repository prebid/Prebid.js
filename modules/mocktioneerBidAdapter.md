Mocktioneer Bid Adapter

Usage
- Add the adapter to your Prebid.js build (e.g., `--modules=mocktioneerBidAdapter`).
- Example adUnit config using the default endpoint:

```javascript
const adUnits = [
  {
    code: 'div-gpt-ad-001',
    mediaTypes: {
      banner: { sizes: [[300, 250]] }
    },
    bids: [
      {
        bidder: 'mocktioneer',
        params: {
          // Optional: override endpoint
          // endpoint: 'http://localhost:7676/openrtb2/auction'
        }
      }
    ]
  }
];
```

Notes
- The mock bidder returns a simple banner creative in `adm` as HTML.
- Currency defaults to `USD`; TTL to 300s.


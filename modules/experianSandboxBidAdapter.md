# Overview

```markdown
Module Name: Experian Sandbox Bid Adapter
Module Type: Bidder Adapter
Maintainer: team-ui@tapad.com
```

# Description

For use with experianRtdProvider. Connects to Experian sample bidder that provides debugging information for clients.

# Test Parameters

## Sample Ad Unit

```javascript
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: { banner: { sizes: [[320, 100]]}},
    bids: [
      {
        bidder: "expSandbox",
        params: { env: 'stg' }
      }
    ]
  },
  
]
```

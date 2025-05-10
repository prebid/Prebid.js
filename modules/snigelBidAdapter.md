# Overview

- Module name: Snigel Bid Adapter
- Module type: Bidder Adapter
- Maintainer: devops@snigel.com
- Bidder code: snigel
- Supported media types: Banner

# Description

Connects to Snigel demand sources for bids.

**Note:** This bid adapter requires our ad operation experts to create an optimized setup for the desired placements on your property.
Please reach out to us [through our contact form](https://snigel.com/get-in-touch). We will reply as soon as possible.

# Parameters

| Name      | Required | Description          |
| :-------- | :------- | :------------------- |
| accountId | Yes      | Account identifier   |
| site      | Yes      | Site identifier      |
| placement | Yes      | Placement identifier |

Snigel will provide all of these parameters to you.

# Test

```js
var adUnits = [
  {
    code: "example",
    mediaTypes: {
      banner: {
        sizes: [
          [970, 90],
          [728, 90],
        ],
      },
    },
    bids: [
      {
        bidder: "snigel",
        params: {
          accountId: "1000",
          site: "test.com",
          placement: "prebid_test_placement",
        },
      },
    ],
  },
];
```

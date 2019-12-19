# Overview
```
Module Name: AdUp Technology Bid Adapter
Module Type: Bidder Adapter
Maintainers:
  - steffen.anders@adup-tech.com
  - sebastian.briesemeister@adup-tech.com
  - marten.lietz@adup-tech.com
```

# Description
Connects to AdUp Technology demand sources to fetch bids.
Please use ```aduptech``` as  bidder code. Only banner formats are supported.

The AdUp Technology bidding adapter requires setup and approval before beginning.
For more information visit [www.adup-tech.com](https://www.adup-tech.com/en) or contact [info@adup-tech.com](mailto:info@adup-tech.com).

# Test Parameters
```js
var adUnits = [
   {
        code: 'banner',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 600]],
            }
        },
        bids: [{
            bidder: 'aduptech',
            params: {
                publisher: 'prebid',
                placement: '12345'
            }
        }]
   }
];
```

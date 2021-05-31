# AdUp Technology Bid Adapter

## Description
Connects to AdUp Technology demand sources to fetch bids.

**Note:** The bid adapter requires correct setup and approval, including an existing publisher account. For more information visit [www.adup-tech.com](https://www.adup-tech.com/en) or contact [info@adup-tech.com](mailto:info@adup-tech.com).


## Overview
- Module Name: AdUp Technology Bid Adapter
- Module Type: Bidder Adapter
- Maintainers:
  - [steffen.anders@adup-tech.com](mailto:steffen.anders@adup-tech.com)
  - [sebastian.briesemeister@adup-tech.com](mailto:sebastian.briesemeister@adup-tech.com)
  - [marten.lietz@adup-tech.com](mailto:marten.lietz@adup-tech.com)
- Bidder code: `aduptech`
- Supported media types: `banner`, `native`

## Paramters
| Name | Scope | Description | Example |
| :--- | :---- | :---------- | :------ |
| `publisher` | required | Unique publisher identifier | `'prebid'` |
| `placement` | required | Unique placement identifier per publisher | `'1234'` |
| `query` | optional | Semicolon separated list of keywords | `'urlaub;ibiza;mallorca'` |
| `adtest` | optional | Deactivates tracking of impressions and clicks. **Should only be used for testing purposes!** | `true` |


## Examples

### Banner
```js
var adUnits = [
   {
        code: "example1",
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 600]],
            }
        },
        bids: [{
            bidder: "aduptech",
            params: {
                publisher: "prebid",
                placement: "12345"
            }
        }]
   }
];
```

### Native
```js
var adUnits = [
   {
        code: "example2",
        mediaTypes: {
            native: {
                image: {
                    required: true,
                    sizes: [150, 150]
                },
                title: {
                    required: true
                },
                body: {
                    required: true
                },
                clickUrl: {
                    required: true
                },
                displayUrl: {
                    required: true
                },
                sponsoredBy: {
                    required: true
                }
            }
        },
        bids: [{
            bidder: "aduptech",
            params: {
                publisher: "prebid",
                placement: "12345"
            }
        }]
   }
];
```

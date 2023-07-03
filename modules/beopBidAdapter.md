# Overview

**Module Name** : BeOp Bidder Adapter  
**Module Type** : Bidder Adapter  
**Maintainer** : tech@beop.io

# Description

Module that connects to BeOp's demand sources

# Test Parameters

```
    var adUnits = [
        {
            code: 'in-article',
            mediaTypes: {
                banner: {
                    sizes: [[1,1]],
                }
            },
            bids: [
                {
                    bidder: "beop",
                    params: {
                        accountId: '5a8af500c9e77c00017e4cad',
                        currency: 'EUR'
                    }
                }
            ]
        }
    ];
```

# Custom Bidder data

If you want to pass your first party data to BeOp, you can set your bidder `config.ortb2` object with

```json
{
  "site": {
    "ext": {
      "bpsegs": ["Your", 1, "ST", "party", "data"],
      "data": {
        "bpsegs": ["Your", 1, "ST", "party", "data"]
      }
    }
  },
  "user": {
    "ext": {
      "bpsegs": ["Your", 1, "ST", "party", "data"],
      "data": {
        "bpsegs": ["Your", 1, "ST", "party", "data"]
      }
    }
  }
}
```

You can choose the location between:

- `site.ext`
- `site.ext.data`
- `user.ext`
- `user.ext.data`

and our BidAdapter will be able to find them

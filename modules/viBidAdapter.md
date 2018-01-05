# Overview

```
Module Name: VI Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@vi.ai
```

# Description

Video Intelligence AG adapter integration to the Prebid library.
Connects to VI demand source.
There should preferably be only one Ad Unit with VI bid adapter on the single page.

# Test Parameters

```
var adUnits = [{
    code: 'div-0',
    sizes: [[320, 480]],
    bids: [{
        bidder: 'vi',
        params: {
            pubId: 'sb_test',
            lang: 'en-US',
            cat: 'IAB1',
	        bidFloor: 0.05 //optional
        }
    }]
}];
```

# Parameters

| Name          | Scope    | Description                                     | Example                           |
| :------------ | :------- | :---------------------------------------------- | :--------------------------------- |
| `pubId` | required | Publisher ID, provided by VI           | 'sb_test' |
| `lang`      | required | Ad language, in ISO 639-1 language code format  | 'en-US', 'es-ES', 'de'              |
| `cat`      | required | Ad IAB category (top-level or subcategory), single one supported  | 'IAB1', 'IAB9-1'        |
| `bidFloor`      | optional | Lowest value of expected bid price  | 0.001        |


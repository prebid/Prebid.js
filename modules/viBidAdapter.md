# Overview

```
Module Name: vi bid adapter
Module Type: Bidder adapter
Maintainer: support@vi.ai
```

# Description

The video intelligence (vi) adapter integration to the Prebid library.
Connects to vi’s demand sources.
There should be only one ad unit with vi bid adapter on each single page.

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
| `pubId` | required | Publisher ID, provided by vi           | 'sb_test' |
| `lang`      | required | Ad language, in ISO 639-1 language code format  | 'en-US', 'es-ES', 'de'              |
| `cat`      | required | Ad IAB category (top-level or subcategory), single one supported  | 'IAB1', 'IAB9-1'        |
| `bidFloor`      | optional | Lowest value of expected bid price  | 0.001        |
| `useSizes`      | optional | Specifies from which section of the config sizes are taken, possible values are 'banner', 'video'. If omitted, sizes from both sections are merged.  | 'banner'  |


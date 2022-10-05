## Overview

This module enables the handling of fledge auction by GPT.
Bid adapters can now return component auction configs in addition to bids.

Those component auction configs will be registered to the GPT ad slot,
and GPT will be responsible to run fledge auction and render the winning fledge ad.

Find out more [here](https://github.com/WICG/turtledove/blob/main/FLEDGE.md).

## Integration

Build the fledge module into the Prebid.js package with:

```
gulp build --modules=fledgeForGpt,...
```

## Module Configuration Parameters

|Name |Type |Description |Notes |
| :------------ | :------------ | :------------ |:------------ |
|enabled | Boolean |Enable/disable the module |Defaults to `false` |

## Configuration

Fledge support need to be enabled at 3 levels:
- `fledgeForGpt` module
- bidder
- adunit
### enabling the fledgeForGpt module
```js
pbjs.que.push(function() {
  pbjs.setConfig({
    fledgeForGpt: {
      enabled: true
    }
  });
});
```

### enablingthe  bidder
```js
pbjs.setBidderConfig({
    bidders: ["openx"],
    config: {
        fledgeEnabled: true
    }
});
```

### enabling the adunit
ortb2Imp.ext.ae on the adunit must be set 1
```js
ortb2Imp: {
    ext: {
        ae: 1
    }
}
```

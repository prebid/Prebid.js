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

## Configuration Parameters

|Name |Type |Description |Notes |
| :------------ | :------------ | :------------ |:------------ |
|enabled | Boolean |Enable/disable the module |Defaults to `false` |

## Example Configurations

### enabling fledge support for openx RTB bid adapter
```js
pbjs.setBidderConfig({
    bidders: ["openx"],
    config: {
        fledgeEnabled: true
    }
});
```

### enabling fledge support for the adunit
ortb2Imp.ext.ae must be 1
```js
ortb2Imp: {
    ext: {
        ae: 1
    }
}
```

### enabling fledge support for the prebid callbacks
```js
pbjs.que.push(function() {
  pbjs.setConfig({
    fledgeGpt: {
      enabled: true
    }
  });
});
```

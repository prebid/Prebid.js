## Overview

This module enables the registering and running of fledge auctions.
Bid adapters can now return component auction configs in addition to bids.

By default, those component auction configs will be registered by prebid and will be run
*only* when the prebid ad wins.

Otherwise when `useGpt=true`, those component auction configs will be registered to the GPT ad slot,
and GPT will be responsible to run fledge auction and render the winning fledge ad.

Find out more [here](https://github.com/WICG/turtledove/blob/main/FLEDGE.md).

## Integration

Build the fledge module into the Prebid.js package with:

```
gulp build --modules=fledge,...
```

## Configuration Parameters

|Name |Type |Description |Notes |
| :------------ | :------------ | :------------ |:------------ |
|enabled | Boolean |Enable/disable the module |Defaults to `true` |
|useGpt | Boolean |GPT will run the fledge auction if true |Defaults to `false` |
|seller | String |fledge top level seller, only needed if useGpt=false |`https://privacysandbox.openx.net` |
|decisionLogicUrl | String |fledge top level decision logic url, only needed if useGpt=false |`https://privacysandbox.openx.net/fledge/decision-logic-top-level.js` |

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



#### prebid running the fledge ad auction

```js
pbjs.que.push(function() {
  pbjs.setConfig({
    fledge: {
      seller: 'https://privacysandbox.openx.net',
      decisionLogicUrl: 'https://privacysandbox.openx.net/fledge/decision-logic-top-level.js'
    }
  });
});
```

#### GPT running the fledge ad auction
```js
pbjs.que.push(function() {
  pbjs.setConfig({
    fledge: {
      useGpt: true
    }
  });
});
```

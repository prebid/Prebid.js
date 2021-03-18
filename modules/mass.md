## Overview

```
Module Name: MASS
Module Type: Other
Maintainer: dev@massplatform.net
```

This module enables the MASS protocol for Prebid. To use it, you'll need to
work with a MASS enabled provider.

This module scans incoming bids for the presence of a "mass" flag being set to 
true in the bid meta or a publisher specified DealID pattern and uses 
external resources to decypher and process the MASS:// URI found within the ad markup.
This modules is designed to work with MASS enabled Exchanges and DSP's.

This module only loads external JavaScript resources if the publisher ad server has 
selected a MASS enabled bid as a winner. 

Find out more [here](https://massplatform.net).

## Disclosure

- This module loads external JavaScript to render creatives
- This module should only be used by publishers that have been invited to the MASS network

## Integration

Build the MASS module into the Prebid.js package with:

```
gulp build --modules=mass,...
```

## Module Configuration

```js
pbjs.que.push(function() {
  pbjs.setConfig({
    mass: {
      enabled: true,
      renderUrl: 'https://cdn.massplatform.net/bootloader.js',
      dealIdPattern: /^MASS/i
    }
  });
});
```

## Disable MASS

The MASS module is enabled by default, but you can disable it using:

```js
pbjs.que.push(function() {
  pbjs.setConfig({
    mass: {
      enabled: false
    }
  });
});
```

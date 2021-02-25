## Overview

```
Module Name: MASS
Module Type: Other
Maintainer: dev@massplatform.net
```

This module enables the MASS protocol for Prebid. To use it, you'll need to
work with a MASS enabled provider.

Find out more [here](https://massplatform.net).

## Disclosure

This module loads external JavaScript to render creatives.

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
      // optional - custom bootloader
      bootloaderUrl: 'https://cdn.massplatform.net/bootloader.js'
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

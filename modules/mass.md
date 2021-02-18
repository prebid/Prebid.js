## Overview

```
Module Name: MASS
Module Type: Other
Maintainer: dev@massplatform.net
```

This module enables the MASS protocol for Prebid. To use it, you'll need to
work with a MASS enabled provider.

Find out more [here](https://massplatform.net).

## Integration

Build the MASS module into the Prebid.js package with:

```
gulp build --modules=mass,...
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

# Overview

Module Name: LiveIntent Provider
Module Type: Rtd Provider
Maintainer: product@liveIntent.com

# Description

This module reads LiveIntent segments from the User ID module via 
`pbjs.getUserIds().lipb.segments` and injects them into `ortb2.user.data`
as a `{ name: 'liveintent.com', segment: [...] }` entry during
`getBidRequestData`.

Please visit [LiveIntent](https://www.liveIntent.com/) for more information.

# Testing

To run the example and test the Rtd provider:

```sh
gulp serve --modules=appnexusBidAdapter,rtdModule,liveIntentRtdProvider,userId,liveIntentIdSystem
```

Open chrome with this URL:
`http://localhost:9999/integrationExamples/gpt/liveIntentRtdProviderExample.html`

To run the unit test:
```sh
gulp test --file "test/spec/modules/liveIntentRtdProvider_spec.js"
```

# Integration

```bash
gulp build --modules=userId,liveIntentIdSystem,rtdModule,liveIntentRtdProvider
```

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders:[{
      name: 'liveintent',
      waitForIt: true
    }]
  }
});
```

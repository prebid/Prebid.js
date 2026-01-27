# Overview

Module Name: LiveIntent Provider
Module Type: Rtd Provider
Maintainer: product@liveIntent.com

# Description

This module extracts segments from `bidRequest.userId.lipb.segments` enriched by the userID module and
injects them in `ortb2.user.data` array entry.

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

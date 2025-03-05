# Overview

Module Name: Mobkoi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: platformteam@mobkoi.com

# Description

Module that connects to Mobkoi Ad Server

### Supported formats:
- Banner

# Test Parameters
```js
const adUnits = [
  {
    code: 'banner-ad',
    mediaTypes: {
      banner: { sizes: [300, 200] },
    },
    bids: [
      {
        bidder: 'mobkoi',
        params: {
          publisherId: 'module-test-publisher-id',
          placementId: 'moudle-test-placement-id',
          adServerBaseUrl: 'https://not.an.adserver.endpoint.com',
        }
      },
    ],
  },
];

pbjs.que.push(function () {
  pbjs.addAdUnits(adUnits);
});
```


# Serve Prebid.js Locally

To serve Prebid.js locally with specific modules, you can use the following command:

```sh
gulp serve-fast --modules=consentManagementTcf,tcfControl,mobkoiBidAdapter
```

# Run bid adapter test locally

```sh
gulp test --file=test/spec/modules/mobkoiBidAdapter_spec.js
```

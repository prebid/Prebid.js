# Permutive Identity Manager

This module supports [Permutive](https://permutive.com/) customers in using Permutive's Identity Manager functionality.

To use this Prebid.js module it is assumed that the site includes Permutive's SDK, with Identity Manager configuration
enabled. See Permutive's user documentation for more information on Identity Manager.

## Building Prebid.js with Permutive Identity Manager Support

Prebid.js must be built with the `permutiveIdentityManagerIdSystem` module in order for Permutive's Identity Manager to be able to
activate relevant user identities to Prebid.

To build Prebid.js with the `permutiveIdentityManagerIdSystem` module included:

```
gulp build --modules=userId,permutiveIdentityManagerIdSystem
```

## Prebid configuration

There is minimal configuration required to be set on Prebid.js, since the bulk of the behaviour is managed through
Permutive's dashboard and SDK.

It is recommended to keep the Prebid.js caching for this module short, since the mechanism by which Permutive's SDK
communicates with Prebid.js is effectively a local cache anyway.

```
pbjs.setConfig({
  ...
  userSync: {
    userIds: [
      {
        name: 'permutiveIdentityManagerId',
        params: {
          ajaxTimeout: 90
        },
        storage: {
          type: 'html5',
          name: 'permutiveIdentityManagerId',
          refreshInSeconds: 5
        }
      }
    ],
    auctionDelay: 100
  },
  ...
});
```

### ajaxTimeout

By default this module will read IDs provided by the Permutive SDK from local storage when requested by prebid, and if
nothing is found, will not provide any identities. If a timeout is provided via the `ajaxTimeout` parameter, it will
instead wait for up to the specified number of milliseconds for Permutive's SDK to become available, and will retrieve
identities from the SDK directly if/when this happens.

This value should be set to a value smaller than the `auctionDelay` set on the `userSync` configuration object, since
there is no point waiting longer than this as the auction will already have been triggered.
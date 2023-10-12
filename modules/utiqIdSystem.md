## Utiq User ID Submodule

Utiq ID Module.

First, make sure to add the utiq submodule to your Prebid.js package with:

```
gulp build --modules=userId,adfBidAdapter,ixBidAdapter,prebidServerBidAdapter,utiqIdSystem
```

## Parameter Descriptions

| Params under userSync.userIds[] | Type             | Description                                                                                                  | Example                          |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| name                            | String           | The name of the module                                                                                       | `"utiq"`                         |
| params                          | Object           | Object with configuration parameters for utiq User Id submodule                                              | -                                |
| params.maxDelayTime             | Integer          | Max amount of time (in seconds) before looking into storage for data                                         | 2500                             |

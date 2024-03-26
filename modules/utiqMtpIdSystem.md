## Utiq User ID Submodule

Utiq MTP ID Module.

First, make sure to add the utiq MTP submodule to your Prebid.js package with:

```
gulp build --modules=userId,adfBidAdapter,ixBidAdapter,prebidServerBidAdapter,utiqMtpIdSystem
```

## Parameter Descriptions

| Params under userSync.userIds[] | Type             | Description                                                                                                  | Example                          |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| name                            | String           | The name of the module                                                                                       | `"utiqMtpId"`                         |

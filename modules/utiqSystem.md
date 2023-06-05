## Utiq User ID Submodule

Utiq ID Module.

First, make sure to add the utiq submodule to your Prebid.js package with:

```
gulp build --modules=userId,adfBidAdapter,ixBidAdapter,prebidServerBidAdapter,utiqSystem
```

## Parameter Descriptions

| Params under userSync.userIds[] | Type             | Description                                                                                                  | Example                          |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| name                            | String           | The name of the module                                                                                       | `"utiq"`                         |
| params                          | Object           | Object with configuration parameters for utiq User Id submodule                                              | -                                |
| params.maxDelayTime             | Integer          | Max amount of time (in seconds) before looking into storage for data                                         | 2500                             |
| bidders                         | Array of Strings | An array of bidder codes to which this user ID may be sent. Currently required and supporting AdformOpenRTB  | [`"adf"`, `"adformPBS"`, `"ix"`] |
| storage                         | Object           | Local storage configuration object                                                                           | -                                |
| storage.type                    | String           | Type of the storage that would be used to store user ID. Must be `"html5"` to utilise HTML5 local storage.   | `"html5"`                        |
| storage.name                    | String           | The name of the key in local storage where the user ID will be stored.                                       | `"utiq"`                         |
| storage.expires                 | Integer          | How long (in days) the user ID information will be stored. For safety reasons, this information is required. | `1`                              |

## trustpid User Id Submodule

trustpid User Id Module.

First, make sure to add the trustpid submodule to your Prebid.js package with:

```
gulp build --modules=userId,adfBidAdapter,ixBidAdapter,prebidServerBidAdapter,trustpidSystem
```

## Parameter Descriptions

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of the module | `"trustpid"`
| params | Required | Object | Object with configuration parameters for trustpid User Id submodule | - |
| params.maxDelayTime | Required | Integer | Max amount of time (in seconds) before looking into storage for data | 2500 |
| bidders | Required | Array of Strings | An array of bidder codes to which this user ID may be sent. Currently required and supporting AdformOpenRTB | [`"adf"`, `"adformPBS"`, `"ix"`] |
| storage | Required | Object | Local storage configuration object | - |
| storage.type | Required | String | Type of the storage that would be used to store user ID. Must be `"html5"` to utilise HTML5 local storage. | `"html5"` |
| storage.name | Required | String | The name of the key in local storage where the user ID will be stored. | `"trustpid"` |
| storage.expires | Required | Integer | How long (in days) the user ID information will be stored. For safety reasons, this information is required.| `1` |
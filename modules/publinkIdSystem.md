## Publink User ID Submodule

Publink user id module

## Configuration Descriptions for the `userId` Configuration Section

| Param Name | Required | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Yes | String | module identifier | `"publinkId"` |
| params.e | Yes | String | hashed email address | `"7D320454942620664D96EF78ED4E3A2A"` |
| params.api_key | Yes | String | api key for access | `"7ab62359-bdc0-4095-b573-ef474fb55d24"` |
| params.site_id | Yes | String | site identifier | `"123456"` |


### Example configuration for Publink
```
pbjs.setConfig({
       userSync: {
           userIds: [{
               name: "publinkId",
               storage: {
                   name: "pbjs_publink",
                   type: "html5"
               },
               params: {
                   e: "7D320454942620664D96EF78ED4E3A2A",           // example hashed email (md5)
                   site_id: "123456",                               // provided by Epsilon
                   api_key: "7ab62359-bdc0-4095-b573-ef474fb55d2"   // provided by Epsilon
               }
           }],
       }
   });
```

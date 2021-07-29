## Publink User ID Submodule

Publink user id module

## Configuration Descriptions for the `userId` Configuration Section

| Param Name | Required | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Yes | String | module identifier | `"publinkId"` |
| params.e | Yes | String | hashed email address | `"e80b5017098950fc58aad83c8c14978e"` |

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
                   e: "e80b5017098950fc58aad83c8c14978e", // example hashed email (md5)
               }
           }],
       }
   });
```

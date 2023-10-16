## UID 2.0 User ID Submodule

UID 2.0 ID Module.

### Prebid Params

Individual params may be set for the UID 2.0 Submodule. At least one identifier must be set in the params.

The module will handle refreshing the token periodically and storing the updated token using the Prebid.js storage manager. If you provide an expired identity and the module has a valid identity which was refreshed from the identity you provide, it will use the refreshed identity. The module stores the original token used for refreshing the token, and it will use the refreshed tokens as long as the original token matches the one supplied.

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2',
            params: {
                // Either:
                uid2ServerCookie: 'your_UID2_server_set_cookie_name'
                // Or:
                uid2Token: {
                    'advertising_token': '...',
                    'refresh_token': '...',
                    // etc. - see the Sample Token below for contents of this object
                }
            }
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the UID 2.0 User ID Module integration.

You should supply either `uid2Token` or `uid2ServerCookie`.

If you provide `uid2Token`, the value should be a JavaScript/JSON object with the decrypted `body` payload response from a call to either `/token/generate` or `/token/refresh`.

If you provide `uid2ServerCookie`, the module will expect that same JSON object to be stored in the cookie - i.e. it will pass the cookie value to `JSON.parse` and expect to receive an object containing similar to what you see in the `Sample token` section below.

The module will make calls to the `/token/refresh` endpoint to update the token it stores internally, so bids may contain an updated token.

If neither of `uid2Token` or `uid2ServerCookie` are supplied, and the module has stored a token using the Prebid.js storage system (typically in a cookie named `__uid2_advertising_token`), it will use that token. This cookie is internal to the module and should not be set directly.

If a new token is supplied which does not match the original token used to generate any refreshed tokens, all stored tokens will be discarded and the new token used instead (refreshed if necessary).

### Sample token

`{`<br />&nbsp;&nbsp;`"advertising_token": "...",`<br />&nbsp;&nbsp;`"refresh_token": "...",`<br />&nbsp;&nbsp;`"identity_expires": 1633643601000,`<br />&nbsp;&nbsp;`"refresh_from": 1633643001000,`<br />&nbsp;&nbsp;`"refresh_expires": 1636322000000,`<br />&nbsp;&nbsp;`"refresh_response_key": "wR5t6HKMfJ2r4J7fEGX9Gw=="`<br />`}`

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the UID20 module - `"uid2"` | `"uid2"` |
| params.uid2Token | Optional | Object | The initial UID2 token. This should be `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint. | See the sample token above. |
| params.uid2ServerCookie | Optional | String | The name of a cookie which holds the initial UID2 token, set by the server. The cookie should contain JSON in the same format as the alternative uid2Token param. **If uid2Token is supplied, this param is ignored.** | See the sample token above. |
| params.uid2ApiBase | Optional | String | Overrides the default UID2 API endpoint. | `https://prod.uidapi.com` _(default)_ |

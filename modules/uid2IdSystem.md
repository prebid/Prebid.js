## UID 2.0 User ID Submodule

UID 2.0 ID Module.

### Prebid Params

Individual params may be set for the UID 2.0 Submodule. At least one identifier must be set in the params.

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2'
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the UID 2.0 User ID Module integration.

You should supply either `uid2Token` or `uid2ServerCookie`. The value should be a JavaScript/JSON object with the decrypted `body` payload response from a call to either `/token/generate` or `/token/refresh`. The module will make calls to the `/token/refresh` endpoint to update the token it stores internally, so bids may contain an updated token.

If neither of `uid2Token` or `uid2ServerCookie` are supplied, the module will still make use of any stored tokens.

If a new token is supplied which does not match the original token used to generate any refreshed tokens, all stored tokens will be discarded and the new token used instead (refreshed if necessary).

The module stores the original token used for refreshing the token, and it will use the refreshed tokens as long as the original token matches.

### Sample token

`{`<br />&nbsp;&nbsp;`"advertising_token": "...",`<br />&nbsp;&nbsp;`"refresh_token": "...",`<br />&nbsp;&nbsp;`"identity_expires": 1633643601000,`<br />&nbsp;&nbsp;`"refresh_from": 1633643001000,`<br />&nbsp;&nbsp;`"refresh_expires": 1636322000000,`<br />&nbsp;&nbsp;`"refresh_response_key": "wR5t6HKMfJ2r4J7fEGX9Gw=="`<br />`}`

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the UID20 module - `"uid2"` | `"uid2"` |
| uid2Token | Optional | Object | The initial UID2 token. This should be `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint. | See the sample token above. |
| uid2ServerCookie | Optional | String | The name of a cookie which holds the initial UID2 token, set by the server. The cookie should contain JSON in the same format as the alternative uid2Token param. **If uid2Token is supplied, this param is ignored.** | See the sample token above. |
| uid2ApiBase | Optional | String | Overrides the default UID2 API endpoint. | `https://prod.uidapi.com` _(default)_ |

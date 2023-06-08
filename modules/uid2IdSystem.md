## UID2 User ID Submodule

UID2 requires initial tokens to be generated server-side. The UID2 module handles storing, providing, and optionally refreshing them. The module can operate in one of two different modes: *Client Refresh* mode or *Server Only* mode.

*Server Only* mode was originally referred to as *legacy mode*, but it is a popular mode for new integrations where publishers prefer to handle token refresh server-side.

**Important information:** UID2 is not designed to be used where GDPR applies. The module checks the passed-in consent data and will not operate if the `gdprApplies` flag is true.

## Client Refresh mode

This is the recommended mode for most scenarios. In this mode, the full response body from the UID2 Token Generate or Token Refresh endpoint must be provided to the module. As long as the refresh token remains valid, the module will refresh the advertising token as needed.

To configure the module to use this mode, you must **either**:
1. Set `params.uid2Cookie` to the name of the cookie which contains the response body as a JSON string, **or**
2. Set `params.uid2Token` to the response body as a JavaScript object.

The `uid2Cookie` param was originally `uid2ServerCookie`. The old name can still be used, however the inclusion of the word 'server' was causing some confusion. If both values are provided, `uid2ServerCookie` will be ignored.

### Client refresh cookie example

In this example, the cookie is called `uid2_pub_cookie`.

Cookie:
```
uid2_pub_cookie={"advertising_token":"...advertising token...","refresh_token":"...refresh token...","identity_expires":1684741472161,"refresh_from":1684741425653,"refresh_expires":1684784643668,"refresh_response_key":"...response key..."}
```

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2',
            params: {
                uid2Cookie: 'uid2_pub_cookie'
            }
        }]
    }
});
```

### Client refresh uid2Token example

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2',
            params: {
                uid2Token: {
                    'advertising_token': '...advertising token...',
                    'refresh_token': '...refresh token...',
                    // etc. - see the Sample Token below for contents of this object
                }
            }
        }]
    }
});
```

## Server-Only Mode

In this mode, only the advertising token is provided to the module. The module will not be able to refresh the token. The publisher is responsible for implementing some other way to refresh the token.

To configure the module to use this mode, you must **either**:
1. Set a cookie named `__uid2_advertising_token` to the advertising token, **or**
2. Set `value` to an ID block containing the advertising token (see "Server only value" example below).

### Server only cookie example

Cookie:
```
__uid2_advertising_token=...advertising token...
```

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2'
        }]
    }
});
```

### Server only value example

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2'
            value: {
                'uid2': {
                    'id': '...advertising token...'
                }
            }
        }]
    }
});
```

## Storage

The module stores a number of internal values. By default, all values are stored in HTML5 local storage. You can switch to cookie storage by setting `params.storage` to `cookie`. The cookie size can be significant and this is not recommended, but is provided as an option if local storage is not an option.

## Sample token

`{`<br />&nbsp;&nbsp;`"advertising_token": "...",`<br />&nbsp;&nbsp;`"refresh_token": "...",`<br />&nbsp;&nbsp;`"identity_expires": 1633643601000,`<br />&nbsp;&nbsp;`"refresh_from": 1633643001000,`<br />&nbsp;&nbsp;`"refresh_expires": 1636322000000,`<br />&nbsp;&nbsp;`"refresh_response_key": "wR5t6HKMfJ2r4J7fEGX9Gw=="`<br />`}`

### Notes

If you are trying to limit the size of cookies, provide the token in configuration and use the default option of local storage.

If you provide an expired identity and the module has a valid identity which was refreshed from the identity you provide, it will use the refreshed identity. The module stores the original token used for refreshing the token, and it will use the refreshed tokens as long as the original token matches the one supplied.

If a new token is supplied which does not match the original token used to generate any refreshed tokens, all stored tokens will be discarded and the new token used instead (refreshed if necessary).

You can set `params.uid2ApiBase` to `"https://operator-integ.uidapi.com"` during integration testing. Be aware that you must use the same environment (production or integration) here as you use for generating tokens.

## Parameter Descriptions for the `usersync` Configuration Section

The below parameters apply only to the UID2 User ID Module integration.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the UID2 module - `"uid2"` | `"uid2"` |
| value | Optional, Server only | Object | An object containing the value for the advertising token. | See the example above. |
| params.uid2Token | Optional, Client refresh | Object | The initial UID2 token. This should be `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint. | See the sample token above. |
| params.uid2Cookie | Optional, Client refresh | String | The name of a cookie which holds the initial UID2 token, set by the server. The cookie should contain JSON in the same format as the uid2Token param. **If uid2Token is supplied, this param is ignored.** | See the sample token above. |
| params.uid2ApiBase | Optional, Client refresh | String | Overrides the default UID2 API endpoint. | `"https://prod.uidapi.com"` _(default)_|
| params.storage | Optional, Client refresh | String | Specify whether to use `cookie` or `localStorage` for module-internal storage. It is recommended to not provide this and allow the module to use the default. | `localStorage` _(default)_ |

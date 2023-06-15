## EUID User ID Submodule

EUID requires initial tokens to be generated server-side. The EUID module handles storing, providing, and optionally refreshing them. The module can operate in one of two different modes: *Client Refresh* mode or *Server Only* mode.

*Server Only* mode was originally referred to as *legacy mode*, but it is a popular mode for new integrations where publishers prefer to handle token refresh server-side.

## Client Refresh mode

This is the recommended mode for most scenarios. In this mode, the full response body from the EUID Token Generate or Token Refresh endpoint must be provided to the module. As long as the refresh token remains valid, the module will refresh the advertising token as needed.

To configure the module to use this mode, you must **either**:
1. Set `params.euidCookie` to the name of the cookie which contains the response body as a JSON string, **or**
2. Set `params.euidToken` to the response body as a JavaScript object.

### Client refresh cookie example

In this example, the cookie is called `euid_pub_cookie`.

Cookie:
```
euid_pub_cookie={"advertising_token":"...advertising token...","refresh_token":"...refresh token...","identity_expires":1684741472161,"refresh_from":1684741425653,"refresh_expires":1684784643668,"refresh_response_key":"...response key..."}
```

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'euid',
            params: {
                euidCookie: 'euid_pub_cookie'
            }
        }]
    }
});
```

### Client refresh euidToken example

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'euid',
            params: {
                euidToken: {
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
1. Set a cookie named `__euid_advertising_token` to the advertising token, **or**
2. Set `value` to an ID block containing the advertising token.

### Server only cookie example

Cookie:
```
__euid_advertising_token=...advertising token...
```

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'euid'
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
            name: 'euid'
            value: {
                'euid': {
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

You can set `params.euidApiBase` to `"https://integ.euid.eu"` during integration testing. Be aware that you must use the same environment (production or integration) here as you use for generating tokens.

## Parameter Descriptions for the `usersync` Configuration Section

The below parameters apply only to the EUID User ID Module integration.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the EUID module - `"euid"` | `"euid"` |
| value | Optional, Server only | Object | An object containing the value for the advertising token. | See the example above. |
| params.euidToken | Optional, Client refresh | Object | The initial EUID token. This should be `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint. | See the sample token above. |
| params.euidCookie | Optional, Client refresh | String | The name of a cookie which holds the initial EUID token, set by the server. The cookie should contain JSON in the same format as the euidToken param. **If euidToken is supplied, this param is ignored.** | See the sample token above. |
| params.euidApiBase | Optional, Client refresh | String | Overrides the default EUID API endpoint. | `"https://prod.euid.eu"` _(default)_|
| params.storage | Optional, Client refresh | String | Specify whether to use `cookie` or `localStorage` for module-internal storage. It is recommended to not provide this and allow the module to use the default. | `localStorage` _(default)_ |

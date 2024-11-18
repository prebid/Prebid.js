## EUID User ID Submodule

The EUID module handles storing, providing, and optionally refreshing tokens. While initial tokens traditionally required server-side generation, the introduction of the *Client-Side Token Generation (CSTG)* mode offers publishers the flexibility to generate EUID tokens directly from the module, eliminating this need. Publishers can choose to operate the module in one of three distinct modes: *Client Refresh* mode, *Server Only* mode and *Client-Side Token Generation* mode.

*Server Only* mode was originally referred to as *legacy mode*, but it is a popular mode for new integrations where publishers prefer to handle token refresh server-side.

*Client-Side Token Generation* mode is included in EUID module by default. However, it's important to note that this mode was created and made available recently. For publishers who do not intend to use it, you have the option to instruct the build to exclude the code related to this feature:

```
    $ gulp build --modules=euidIdSystem --disable UID2_CSTG
```
If you do plan to use Client-Side Token Generation (CSTG) mode, please consult the EUID Team first as they will provide required configuration values for you to use (see the Client-Side Token Generation (CSTG) mode section below for details)

**This mode is created and made available recently. Please consult EUID Team first as they will provide required configuration values for you to use.**

For publishers seeking a purely client-side integration without the complexities of server-side involvement, the CSTG mode is highly recommended. This mode requires the provision of a public key, subscription ID and [directly identifying information (DII)](https://unifiedid.com/docs/ref-info/glossary-uid#gl-dii) - either emails or phone numbers. In the CSTG mode, the module takes on the responsibility of encrypting the DII, generating the EUID token, and handling token refreshes when necessary.

To configure the module to use this mode, you must:
1. Set `parmas.serverPublicKey`  and `params.subscriptionId` (please reach out to the UID2 team to obtain these values)
2. Provide **ONLY ONE DII** by setting **ONLY ONE** of `params.email`/`params.phone`/`params.emailHash`/`params.phoneHash`

Below is a table that provides guidance on when to use each directly identifying information (DII) parameter, along with information on whether normalization and hashing are required by the publisher for each parameter.

| DII param        | When to use it                                        | Normalization required by publisher? | Hashing required by publisher? |
|------------------|-------------------------------------------------------|--------------------------------------|--------------------------------|
| params.email     | When you have users' email address                    | No                                   | No                             |
| params.phone     | When you have user's phone number                     | Yes                                  | No                             |
| params.emailHash | When you have user's hashed, normalized email address | Yes                                  | Yes                            |
| params.phoneHash | When you have user's hashed, normalized phone number  | Yes                                  | Yes                            |


*Note that setting params.email will normalize email addresses, but params.phone requires phone numbers to be normalized.*

Refer to [Normalization and Encoding](#normalization-and-encoding) for details on email address normalization, SHA-256 hashing and Base64 encoding.

### CSTG example

Configuration:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'euid',
            params: {
               serverPublicKey: '...server public key...',
               subscriptionId: '...subcription id...',
               email: 'user@email.com',
               //phone: '+0000000',
               //emailHash: '...email hash...',
               //phoneHash: '...phone hash ...'
            }
        }]
    }
});
```

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

## Optout response

`{`<br />&nbsp;&nbsp;`"optout": "true",`<br />`}`


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

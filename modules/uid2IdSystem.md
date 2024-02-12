# UID2 User ID Submodule

## Overview

The UID2 module handles storing, providing, and optionally generating and refreshing tokens. For more details, see the [UID2 Integration Overview for Prebid.js](https://unifiedid.com/docs/guides/integration-prebid).

**Important information:** UID2 is not designed to be used where GDPR applies. The module checks the passed-in consent data and will not operate if the `gdprApplies` flag is true.

Depending on access to DII, there are two methods to generate UID2 tokens for use with Prebid.js, as shown in the following table.

Determine which method is best for you, and then follow the applicable integration guide.

| Scenario | Integration Guide |
| :--- | :--- |
| You have access to DII on the client side and want to do front-end development only. | [UID2 Client-Side Integration Guide for Prebid.js](https://unifiedid.com/docs/guides/integration-prebid-client-side). |
| You have access to DII on the server side and can do server-side development. | [UID2 Server-Side Integration Guide for Prebid.js](https://unifiedid.com/docs/guides/integration-prebid-server-side). |

## Storage

The module stores a number of internal values. By default, all values are stored in HTML5 local storage. You can switch to cookie storage by setting `params.storage` to `cookie`. The cookie size can be significant and this is not recommended, but is provided as an option if local storage is not an option.

## Parameter Descriptions for the `usersync` Configuration Section

The following parameters apply only to the UID2 User ID Module integration.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the UID2 module. Must be `"uid2"`. | `"uid2"` |
| params.uid2ApiBase | Optional | String | Overrides the default UID2 API endpoint. | `"https://prod.uidapi.com"` _(default)_|
| params.storage | Optional | String | Specify whether to use `cookie` or `localStorage` for module-internal storage. It is recommended to not provide this and allow the module to use the default. | `localStorage` _(default)_ |

### Client-side Integration

The following parameters apply to the UID2 User ID Module if you are following the client-side integration guide. Exactly one of params.email, params.emailHash, params.phone, and params.phoneHash must be provided.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| params.serverPublicKey | Required for client-side integration | String | A public key for encrypting the DII payload for the Operator's CSTG endpoint. | - |
| params.subscriptionId | Required for client-side integration | String | A publisher identifier. | - |
| params.email | Optional | String | The user's email address. Provide this parameter if using email as the DII. | `"test@example.com"` |
| params.emailHash | Optional | String | A hashed, normalized representation of the user's email. Provide this parameter if using emailHash as the DII. | `"tMmiiTI7IaAcPpQPFQ65uMVCWH8av9jw4cwf/F5HVRQ="` |
| params.phone | Optional | String | The user's phone number. Provide this parameter if using phone as the DII. | `"+15555555555"` |
| params.phoneHash | Optional | String | A hashed, normalized representation of the user's phone number. Provide this parameter if using phoneHash as the DII. | `"tMmiiTI7IaAcPpQPFQ65uMVCWH8av9jw4cwf/F5HVRQ="` |

### Server-side Integration

#### Server-only Mode

The following parameters apply to the UID2 User ID Module if you are following the server-side integration guide with server-only mode.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| value | Required for server-only mode | Object | An object containing the value for the advertising token. | See the example below. |

#### Client Refresh Mode

The following parameters apply to the UID2 User ID Module if you are following the server-side integration guide with client refresh mode. Either params.uid2Token or params.uid2Cookie must be provided.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| params.uid2Token | Optional | Object | The initial UID2 token. This should be `body` element of the decrypted response from a call to the `/token/generate` or `/token/refresh` endpoint. | See the sample token below. |
| params.uid2Cookie | Optional | String | The name of a cookie which holds the initial UID2 token, set by the server. The cookie should contain JSON in the same format as the uid2Token param. **If uid2Token is supplied, this param is ignored.** | See the sample token below. |

## Sample token

`{`<br />&nbsp;&nbsp;`"advertising_token": "...",`<br />&nbsp;&nbsp;`"refresh_token": "...",`<br />&nbsp;&nbsp;`"identity_expires": 1633643601000,`<br />&nbsp;&nbsp;`"refresh_from": 1633643001000,`<br />&nbsp;&nbsp;`"refresh_expires": 1636322000000,`<br />&nbsp;&nbsp;`"refresh_response_key": "wR5t6HKMfJ2r4J7fEGX9Gw=="`<br />`}`

## Normalization and Encoding

Refer to [Normalization and Encoding](https://unifiedid.com/docs/getting-started/gs-normalization-encoding).

## Notes

- If you provide an expired identity and the module has a valid identity which was refreshed from the identity you provide, it will use the refreshed identity. The module stores the original token used for refreshing the token, and it will use the refreshed tokens as long as the original token matches the one supplied.

- If a new token is supplied which does not match the original token used to generate any refreshed tokens, all stored tokens will be discarded and the new token used instead (refreshed if necessary).

- You can set `params.uid2ApiBase` to `"https://operator-integ.uidapi.com"` during integration testing. Be aware that you must use the same environment (production or integration) here as you use for generating tokens.

- If you are building Prebid.js and following the server-side integration guide, you can create a smaller Prebid.js build by disabling client-side integration functionality. To do this, pass the `--disable UID2_CSTG` flag:

```
    $ gulp build --modules=uid2IdSystem --disable UID2_CSTG
```